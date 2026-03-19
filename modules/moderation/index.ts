import type { Command, CommandContext } from '../../core/src/types.js';
import { db, users, warnings, groups } from '../../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getOrCreateUser, resolveEffectiveUser } from '../../core/src/utils.js';

export const moderationCommands: Command[] = [
  // ── Warn ──────────────────────────────────────────────────
  {
    name: 'warn',
    aliases: ['advertir'],
    description: 'Advierte a un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    groupOnly: true,
    execute: async (ctx: CommandContext) => {
      const [mention, ...reasonParts] = ctx.args;
      const reason = reasonParts.join(' ') || 'Sin motivo especificado';

      if (!mention) {
        await ctx.reply('❌ Uso: /warn @usuario <motivo>');
        return;
      }

      // Obtener al emisor
      const issuer = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const effectiveIssuer = await resolveEffectiveUser(issuer.id);
      if (!effectiveIssuer) {
        await ctx.reply('❌ Error al procesar el warn.');
        return;
      }

      // Buscar al usuario objetivo por displayName
      const mentionClean = mention.replace(/^@/, '');
      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!target) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}**. Debe haber usado el bot al menos una vez.`);
        return;
      }

      // Contar warns previos de este usuario
      const prevWarns = await db
        .select()
        .from(warnings)
        .where(eq(warnings.userId, target.id));

      // Insertar warn
      await db.insert(warnings).values({
        userId: target.id,
        groupId: ctx.groupId ? undefined : undefined, // podría obtener del grupo
        reason,
        issuedBy: effectiveIssuer.id,
      });

      const newWarnCount = prevWarns.length + 1;
      let msg = `⚠️ **${target.displayName}** ha sido advertido/a (${newWarnCount}/3)\nMotivo: ${reason}`;

      if (newWarnCount >= 3) {
        // Auto-ban después de 3 warns
        await db.update(users).set({ isBanned: true, banReason: 'Acumuló 3 advertencias' }).where(eq(users.id, target.id));
        msg = `🔨 **${target.displayName}** ha sido BANEADO por acumular 3 advertencias.\nMotivo: ${reason}`;
      }

      await ctx.reply(msg);
    },
  },

  // ── Warnings list ─────────────────────────────────────────
  {
    name: 'warns',
    aliases: ['advertencias'],
    description: 'Lista las advertencias de un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply('❌ Uso: /warns @usuario');
        return;
      }

      const mentionClean = mention.replace(/^@/, '');
      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!target) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}**.`);
        return;
      }

      const warns = await db
        .select()
        .from(warnings)
        .where(eq(warnings.userId, target.id))
        .orderBy(desc(warnings.issuedAt));

      if (!warns.length) {
        await ctx.reply(`✅ **${target.displayName}** no tiene advertencias.`);
        return;
      }

      const lines = warns.map(
        (w, i) => `${i + 1}. **${w.reason}** (${new Date(w.issuedAt).toLocaleDateString()})`
      );

      await ctx.reply(`📋 **Advertencias de ${target.displayName}** (${warns.length}/3)\n\n${lines.join('\n')}`);
    },
  },

  // ── Ban ───────────────────────────────────────────────────
  {
    name: 'ban',
    aliases: ['banear'],
    description: 'Banea a un usuario del bot',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const [mention, ...reasonParts] = ctx.args;
      const reason = reasonParts.join(' ') || 'Sin motivo';

      if (!mention) {
        await ctx.reply('❌ Uso: /ban @usuario <motivo>');
        return;
      }

      const mentionClean = mention.replace(/^@/, '');
      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!target) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}**.`);
        return;
      }

      if (target.isBanned) {
        await ctx.reply(`⚠️ **${target.displayName}** ya estaba baneado.`);
        return;
      }

      await db.update(users).set({ isBanned: true, banReason: reason }).where(eq(users.id, target.id));

      await ctx.reply(`🔨 **${target.displayName}** ha sido baneado/a del bot.\nMotivo: ${reason}`);
    },
  },

  // ── Unban ─────────────────────────────────────────────────
  {
    name: 'unban',
    aliases: ['desbanear'],
    description: 'Desbanea a un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply('❌ Uso: /unban @usuario');
        return;
      }

      const mentionClean = mention.replace(/^@/, '');
      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!target) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}**.`);
        return;
      }

      if (!target.isBanned) {
        await ctx.reply(`⚠️ **${target.displayName}** no está baneado.`);
        return;
      }

      await db.update(users).set({ isBanned: false, banReason: null }).where(eq(users.id, target.id));

      await ctx.reply(`✅ **${target.displayName}** ha sido desbaneado/a.`);
    },
  },

  // ── Clearban (limpiar warns y ban) ────────────────────────
  {
    name: 'clearban',
    aliases: ['limpiar_warn'],
    description: 'Limpia los warns y desbanea a un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply('❌ Uso: /clearban @usuario');
        return;
      }

      const mentionClean = mention.replace(/^@/, '');
      const [target] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!target) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}**.`);
        return;
      }

      // Eliminar todos los warns
      await db.delete(warnings).where(eq(warnings.userId, target.id));

      // Desbanear
      await db.update(users).set({ isBanned: false, banReason: null }).where(eq(users.id, target.id));

      await ctx.reply(`✅ **${target.displayName}** — warns eliminados y baneado quitado.`);
    },
  },

  // ── Prefix config ─────────────────────────────────────────
  {
    name: 'prefix',
    aliases: ['prefijo'],
    description: 'Cambia el prefijo del bot en este grupo',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    adminOnly: true,
    groupOnly: true,
    execute: async (ctx: CommandContext) => {
      const newPrefix = ctx.args[0];
      if (!newPrefix || newPrefix.length > 3) {
        await ctx.reply('❌ Uso: /prefix <prefijo> (máx 3 caracteres)');
        return;
      }

      const [existingGroup] = await db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.platformId, ctx.groupId!), eq(groups.platform, ctx.platform)))
        .limit(1);

      if (existingGroup) {
        await db.update(groups).set({ prefix: newPrefix })
          .where(and(eq(groups.platformId, ctx.groupId!), eq(groups.platform, ctx.platform)));
      } else {
        await db.insert(groups).values({
          platformId: ctx.groupId!,
          platform: ctx.platform,
          name: ctx.groupId!,
          prefix: newPrefix,
        });
      }

      await ctx.reply(`✅ Prefijo cambiado a: **${newPrefix}**`);
    },
  },

  // ── Stats ────────────────────────────────────────────────
  {
    name: 'stats',
    aliases: ['estadisticas'],
    description: 'Muestra estadísticas del bot',
    category: 'moderation',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const totalUsers = await db.select().from(users);
      const totalGroups = await db.select().from(groups);
      await ctx.reply(
        `📊 **Estadísticas de Yukiko**\n\n` +
        `👥 Usuarios registrados: **${totalUsers.length}**\n` +
        `🏠 Grupos activos: **${totalGroups.length}**\n` +
        `⏱️ Uptime: disponible en /monitor`
      );
    },
  },

  // ── Help ─────────────────────────────────────────────────
  {
    name: 'help',
    aliases: ['ayuda', 'comandos', 'h'],
    description: 'Muestra todos los comandos disponibles',
    category: 'utility',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const msg =
        '🌨️ **Yukiko — Comandos disponibles**\n\n' +
        '🤖 **IA**\n' +
        '`/ask` — Pregúntale algo a Yukiko\n' +
        '`/imagine` — Genera una imagen con IA\n' +
        '`/rp` — Roleplay con IA\n' +
        '`/translate` — Traduce texto\n\n' +
        '💰 **Economía**\n' +
        '`/daily` — Recompensa diaria\n' +
        '`/balance` — Ver tus monedas\n' +
        '`/shop` — Tienda\n' +
        '`/buy` — Comprar item\n' +
        '`/inventory` — Ver inventario\n' +
        '`/transfer` — Transferir monedas\n' +
        '`/top` — Ranking de usuarios\n' +
        '`/levels` — Ver tu nivel\n' +
        '`/clear` — Limpiar monedas\n\n' +
        '🎭 **Roleplay**\n' +
        '`/hug` `/pat` `/kiss` `/slap` `/cuddle`\n' +
        '`/poke` `/bite` `/lick` `/wave` `/highfive`\n' +
        '`/dance` `/feed`\n\n' +
        '🔞 **+18** *(solo grupos habilitados)*\n' +
        '`/adult` — Gestionar contenido +18\n' +
        '`/hentai` — Imagen hentai\n' +
        '`/gif18` — GIF +18 animado\n' +
        '`/verify18` — Verificar edad\n\n' +
        '🛠️ **Utilidad**\n' +
        '`/accounts` — Ver cuentas vinculadas\n' +
        '`/link` — Vincular plataformas\n' +
        '`/linkcode` — Código de vinculación\n' +
        '`/unlink` — Desvincular cuenta\n' +
        '`/stats` — Estadísticas del bot\n\n' +
        '🔨 **Moderación** *(solo admins)*\n' +
        '`/ban` `/unban` `/warn` `/warns`\n' +
        '`/clearban` `/prefix`\n';
      await ctx.reply(msg);
    },
  },
];
