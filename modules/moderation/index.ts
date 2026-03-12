import type { Command, CommandContext } from '../../core/src/types.js';
import { db, users, warnings, groups } from '../../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getOrCreateUser } from '../../core/src/utils.js';

export const moderationCommands: Command[] = [
  // ── Warn ──────────────────────────────────────────────────
  {
    name: 'warn',
    aliases: ['advertir'],
    description: 'Advierte a un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    groupOnly: true,
    execute: async (ctx: CommandContext) => {
      const [mention, ...reasonParts] = ctx.args;
      const reason = reasonParts.join(' ') || 'Sin motivo especificado';

      if (!mention) {
        await ctx.reply('❌ Uso: /warn @usuario <motivo>');
        return;
      }

      await ctx.reply(`⚠️ **${mention}** ha sido advertido/a.\nMotivo: ${reason}`);
    },
  },

  // ── Warnings list ─────────────────────────────────────────
  {
    name: 'warns',
    aliases: ['advertencias'],
    description: 'Lista las advertencias de un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply('❌ Uso: /warns @usuario');
        return;
      }
      await ctx.reply(`📋 Advertencias de ${mention}: (ver panel de admin en /dashboard)`);
    },
  },

  // ── Ban ───────────────────────────────────────────────────
  {
    name: 'ban',
    aliases: ['banear'],
    description: 'Banea a un usuario del bot',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const [mention, ...reasonParts] = ctx.args;
      const reason = reasonParts.join(' ') || 'Sin motivo';

      if (!mention) {
        await ctx.reply('❌ Uso: /ban @usuario <motivo>');
        return;
      }

      await ctx.reply(`🔨 **${mention}** ha sido baneado/a del bot.\nMotivo: ${reason}`);
    },
  },

  // ── Unban ─────────────────────────────────────────────────
  {
    name: 'unban',
    aliases: ['desbanear'],
    description: 'Desbanea a un usuario',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply('❌ Uso: /unban @usuario');
        return;
      }
      await ctx.reply(`✅ **${mention}** ha sido desbaneado/a.`);
    },
  },

  // ── Clear messages (Discord only) ─────────────────────────
  {
    name: 'clear',
    aliases: ['purge', 'limpiar'],
    description: 'Elimina mensajes del chat (Discord)',
    category: 'moderation',
    platforms: ['discord'],
    adminOnly: true,
    execute: async (ctx: CommandContext) => {
      const amount = parseInt(ctx.args[0] ?? '10');
      if (isNaN(amount) || amount < 1 || amount > 100) {
        await ctx.reply('❌ Uso: /clear <1-100>');
        return;
      }
      // Actual deletion handled by Discord platform adapter
      await ctx.reply(`🗑️ Eliminando ${amount} mensajes...`);
    },
  },

  // ── Prefix config ─────────────────────────────────────────
  {
    name: 'prefix',
    aliases: ['prefijo'],
    description: 'Cambia el prefijo del bot en este grupo',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    groupOnly: true,
    execute: async (ctx: CommandContext) => {
      const newPrefix = ctx.args[0];
      if (!newPrefix || newPrefix.length > 3) {
        await ctx.reply('❌ Uso: /prefix <prefijo> (máx 3 caracteres)');
        return;
      }

      await db
        .update(groups)
        .set({ prefix: newPrefix })
        .where(and(eq(groups.platformId, ctx.groupId!), eq(groups.platform, ctx.platform)));

      await ctx.reply(`✅ Prefijo cambiado a: **${newPrefix}**`);
    },
  },

  // ── Stats ────────────────────────────────────────────────
  {
    name: 'stats',
    aliases: ['estadisticas'],
    description: 'Muestra estadísticas del bot',
    category: 'moderation',
    platforms: ['discord', 'telegram', 'whatsapp'],
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
];
