// ============================================================
// Yukiko — Módulo de vinculación de cuentas entre plataformas
// ============================================================
// Flujo:
//   1. Usuario llega NUEVO a una plataforma → /start o primer comando
//      El bot le pregunta: "¿Ya tienes Yukiko en otra app?"
//   2a. Si dice SÍ → le pide que vaya a esa app y escriba /linkcode
//       Esa app genera un código temporal (YUKXXXX1234, válido 10min)
//       El usuario lo introduce aquí con /link YUKXXXX1234
//       Se fusionan sus cuentas (saldo, XP, adulto...)
//   2b. Si dice NO → se crea cuenta nueva normalmente
//
// Comandos:
//   /link [código]  → vincular cuenta (o pedir el código si no lo tiene)
//   /linkcode       → generar código para vincular desde OTRA plataforma
//   /unlink         → desvincular (opcional, avanzado)
//   /accounts       → ver mis cuentas vinculadas
// ============================================================

import type { Command, CommandContext } from '../../core/src/types.js';
import { db } from '../../db/index.js';
import {
  users,
  linkTokens,
  linkedAccountsLog,
  adultVerifications,
} from '../../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { getOrCreateUser } from '../../core/src/utils.js';
import type { Platform } from '../../core/src/types.js';

// ─── Helpers ─────────────────────────────────────────────────

const PLATFORM_NAMES: Record<Platform, string> = {
  discord: 'Discord',
  telegram: 'Telegram',
  mobile: 'Mobile',
};

const PLATFORM_EMOJIS: Record<Platform, string> = {
  discord: '💜',
  telegram: '🔵',
  mobile: '📱',
};

/** Genera un código corto único estilo YUK-XXXX-1234 */
function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin O,0,I,1 para evitar confusión
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `YUK-${part1}-${part2}`;
}

/** Resuelve el userId "efectivo" de un usuario:
 *  Si está vinculado a otro, devuelve el ID del master.
 *  Así toda la economía/XP/adulto se centraliza en una sola cuenta.
 */
export async function resolveEffectiveUserId(userId: string): Promise<string> {
  const [user] = await db.select({ linkedToUserId: users.linkedToUserId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.linkedToUserId ?? userId;
}

/** Devuelve todas las plataformas vinculadas a un userId master */
export async function getLinkedPlatforms(masterUserId: string): Promise<Array<{
  platform: Platform;
  displayName: string;
  platformId: string;
}>> {
  const linked = await db.select({
    platform: users.platform,
    displayName: users.displayName,
    platformId: users.platformId,
  })
  .from(users)
  .where(eq(users.linkedToUserId, masterUserId));

  return linked as Array<{ platform: Platform; displayName: string; platformId: string }>;
}

/** Fusiona la cuenta secundaria en la maestra:
 *  - Suma saldo y XP
 *  - Hereda verificación adulto si alguna lo tiene
 *  - Marca la cuenta secundaria como vinculada
 */
async function mergeAccounts(masterUserId: string, secondaryUserId: string): Promise<{
  balanceMerged: number;
  xpMerged: number;
  adultInherited: boolean;
}> {
  const [master] = await db.select().from(users).where(eq(users.id, masterUserId));
  const [secondary] = await db.select().from(users).where(eq(users.id, secondaryUserId));

  if (!master || !secondary) throw new Error('Usuario no encontrado');

  const newBalance = master.balance + secondary.balance;
  const newXp = master.xp + secondary.xp;
  const newLevel = Math.max(master.level, secondary.level);
  const adultInherited = secondary.isVerifiedAdult && !master.isVerifiedAdult;
  const newAdult = master.isVerifiedAdult || secondary.isVerifiedAdult;

  // Actualizar master
  await db.update(users).set({
    balance: newBalance,
    xp: newXp,
    level: newLevel,
    isVerifiedAdult: newAdult,
  }).where(eq(users.id, masterUserId));

  // Marcar secondary como vinculada al master y poner sus stats a 0
  // (el master ya tiene todo lo que importa)
  await db.update(users).set({
    linkedToUserId: masterUserId,
    balance: 0,
    xp: 0,
  }).where(eq(users.id, secondaryUserId));

  // Log
  await db.insert(linkedAccountsLog).values({
    masterUserId,
    linkedUserId: secondaryUserId,
    linkedPlatform: secondary.platform,
    balanceMerged: secondary.balance,
    xpMerged: secondary.xp,
  });

  return {
    balanceMerged: secondary.balance,
    xpMerged: secondary.xp,
    adultInherited,
  };
}

// ─── Flujo de onboarding ──────────────────────────────────────

/** 
 * Llama esto cuando un usuario llega por primera vez a una plataforma.
 * Si ya existe su platformId, no hace nada.
 * Si es nuevo, devuelve true para que la plataforma muestre el mensaje de onboarding.
 */
export async function handleNewUser(
  platformId: string,
  platform: Platform,
  displayName: string,
  username?: string,
): Promise<{ isNew: boolean; userId: string }> {
  // Buscar si ya existe
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.platformId, platformId), eq(users.platform, platform)))
    .limit(1);

  if (existing[0]) {
    return { isNew: false, userId: existing[0].id };
  }

  // Crear usuario nuevo
  const [created] = await db.insert(users).values({
    platformId,
    platform,
    displayName,
    username,
  }).returning({ id: users.id });

  return { isNew: true, userId: created.id };
}

/** Mensaje de onboarding que se envía cuando el usuario es nuevo */
export function buildOnboardingMessage(platform: Platform, displayName: string): string {
  const emoji = PLATFORM_EMOJIS[platform];
  const platformName = PLATFORM_NAMES[platform];

  return (
    `🌨️ **¡Hola, ${displayName}! ¡Soy Yukiko!** 🐱\n\n` +
    `Tu compañera neko kawaii en ${emoji} ${platformName}.\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `❓ **¿Ya tienes Yukiko en otra app?**\n` +
    `(Discord o Telegram)\n\n` +
    `Si dices que **SÍ**, podrás vincular tus cuentas y ` +
    `conservar tu saldo, nivel y verificación de edad.\n\n` +
    `👉 **¿Ya tienes cuenta?**\n` +
    `  • **Sí** → escribe \`/link\` y sigue las instrucciones\n` +
    `  • **No** → escribe \`/start\` para empezar desde cero\n\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `💡 También puedes vincular más tarde con \`/link\``
  );
}

// ─── Comandos ─────────────────────────────────────────────────

export const linkCommands: Command[] = [

  // ── /link [código] ──────────────────────────────────────────
  {
    name: 'link',
    aliases: ['vincular', 'conectar'],
    description: 'Vincula tu cuenta con otra plataforma usando un código',
    category: 'utility',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const token = ctx.args[0]?.toUpperCase();

      // Sin código → explicar cómo obtenerlo
      if (!token) {
        await ctx.reply(
          `🔗 **Vinculación de cuentas**\n\n` +
          `Este comando conecta tu cuenta de Yukiko entre plataformas ` +
          `(Discord, Telegram y WhatsApp).\n\n` +
          `**¿Cómo funciona?**\n` +
          `1. Ve a la app donde **ya tienes** tu cuenta de Yukiko\n` +
          `2. Escribe \`/linkcode\` — recibirás un código temporal\n` +
          `3. Vuelve aquí y escribe:\n` +
          `   \`/link YUK-XXXX-XXXX\`\n\n` +
          `⏰ El código dura **10 minutos**.\n\n` +
          `💡 Si aún no tienes cuenta en ninguna app, usa \`/start\` directamente.`
        );
        return;
      }

      // Validar formato del token
      if (!/^YUK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(token)) {
        await ctx.reply(
          `❌ Código inválido. El formato debe ser \`YUK-XXXX-XXXX\`.\n\n` +
          `Genera uno nuevo en la otra app con \`/linkcode\`.`
        );
        return;
      }

      // Buscar el token en BD
      const now = new Date();
      const [tokenRow] = await db
        .select()
        .from(linkTokens)
        .where(
          and(
            eq(linkTokens.token, token),
            gt(linkTokens.expiresAt, now),
            isNull(linkTokens.usedAt),
          )
        )
        .limit(1);

      if (!tokenRow) {
        await ctx.reply(
          `❌ Código no encontrado, ya usado o caducado.\n\n` +
          `Genera uno nuevo en la otra app con \`/linkcode\` (válido 10 min).`
        );
        return;
      }

      // Obtener/crear usuario en esta plataforma
      const thisUser = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName, ctx.username);

      // No vincular con uno mismo
      if (tokenRow.userId === thisUser.id) {
        await ctx.reply(
          `❌ No puedes vincular la misma cuenta consigo misma. ` +
          `El código debe generarse desde una **plataforma diferente**.`
        );
        return;
      }

      // Evitar vincular si ya están vinculados al mismo master
      const masterOfToken = await resolveEffectiveUserId(tokenRow.userId);
      const masterOfThis  = await resolveEffectiveUserId(thisUser.id);

      if (masterOfToken === masterOfThis) {
        await ctx.reply(`✅ ¡Estas cuentas ya estaban vinculadas! Usa \`/accounts\` para verlas.`);
        return;
      }

      // La cuenta que generó el código es la MASTER
      // La cuenta actual (nueva plataforma) es la que se vincula
      const [sourceUser] = await db.select().from(users).where(eq(users.id, tokenRow.userId));
      const sourceplatformName = PLATFORM_NAMES[sourceUser.platform as Platform];
      const sourcePlatformEmoji = PLATFORM_EMOJIS[sourceUser.platform as Platform];

      // Verificar que el usuario actual no tenga stats que perder sin saberlo
      const hasStats = thisUser.balance > 0 || thisUser.xp > 0;
      const statsWarning = hasStats
        ? `\n⚠️ Tus stats actuales (${thisUser.balance} 🪙, ${thisUser.xp} XP) se **sumarán** a tu cuenta principal.`
        : '';

      // Marcar el token como usado
      await db.update(linkTokens)
        .set({ usedAt: new Date() })
        .where(eq(linkTokens.id, tokenRow.id));

      // Fusionar cuentas: el master es quien generó el código
      const { balanceMerged, xpMerged, adultInherited } = await mergeAccounts(
        masterOfToken,
        thisUser.id,
      );

      // Obtener stats del master tras la fusión
      const [updatedMaster] = await db.select().from(users).where(eq(users.id, masterOfToken));

      let successMsg =
        `✅ **¡Cuentas vinculadas!** 🎉\n\n` +
        `${sourcePlatformEmoji} ${sourceplatformName} ↔️ ${PLATFORM_EMOJIS[ctx.platform]} ${PLATFORM_NAMES[ctx.platform]}\n\n` +
        `**Fusión completada:**\n` +
        `  🪙 Saldo fusionado: **+${balanceMerged}** (total: **${updatedMaster?.balance ?? 0}**)\n` +
        `  ⭐ XP fusionado: **+${xpMerged}** (total: **${updatedMaster?.xp ?? 0}**)\n`;

      if (adultInherited) {
        successMsg += `  🔞 Verificación +18 **heredada** ✅\n`;
      }

      successMsg +=
        `\n💡 Ahora tu progreso (monedas, XP, nivel, +18) es compartido ` +
        `en todas las plataformas donde tengas Yukiko.\n\n` +
        `Usa \`/accounts\` para ver todas tus plataformas vinculadas.`;

      await ctx.reply(successMsg);
    },
  },

  // ── /linkcode ────────────────────────────────────────────────
  {
    name: 'linkcode',
    aliases: ['codigo-vinculacion', 'micodigo'],
    description: 'Genera un código para vincular tu cuenta en otra plataforma',
    category: 'utility',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName, ctx.username);

      // Limpiar tokens anteriores caducados o ya usados (limpieza ligera)
      await db
        .delete(linkTokens)
        .where(
          and(
            eq(linkTokens.userId, user.id),
            isNull(linkTokens.usedAt),
          )
        );

      // Generar nuevo token
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      await db.insert(linkTokens).values({
        userId: user.id,
        platform: ctx.platform,
        token,
        expiresAt,
      });

      // Ver qué otras plataformas ya tiene vinculadas
      const effectiveId = await resolveEffectiveUserId(user.id);
      const linkedPlatforms = await getLinkedPlatforms(effectiveId);
      const linkedNames = linkedPlatforms
        .filter(p => p.platform !== ctx.platform)
        .map(p => `${PLATFORM_EMOJIS[p.platform]} ${PLATFORM_NAMES[p.platform]}`)
        .join(', ') || 'ninguna aún';

      await ctx.reply(
        `🔑 **Tu código de vinculación:**\n\n` +
        `\`\`\`\n${token}\n\`\`\`\n\n` +
        `⏰ Válido durante **10 minutos**.\n\n` +
        `**¿Cómo usarlo?**\n` +
        `1. Abre Yukiko en la **nueva plataforma**\n` +
        `2. Escribe: \`/link ${token}\`\n\n` +
        `📊 **Tu cuenta actual:**\n` +
        `  🪙 ${user.balance} monedas | ⭐ XP ${user.xp} | Nv. ${user.level}\n` +
        `  🔞 Adulto: ${user.isVerifiedAdult ? 'Verificado ✅' : 'No verificado'}\n` +
        `  🔗 Plataformas vinculadas: ${linkedNames}\n\n` +
        `⚠️ El saldo y XP de ambas cuentas se **suman**. No te preocupes, no pierdes nada.`
      );
    },
  },

  // ── /accounts ────────────────────────────────────────────────
  {
    name: 'accounts',
    aliases: ['cuentas', 'plataformas', 'misplataformas'],
    description: 'Ver todas tus plataformas vinculadas',
    category: 'utility',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName, ctx.username);
      const effectiveId = await resolveEffectiveUserId(user.id);
      const [master] = await db.select().from(users).where(eq(users.id, effectiveId));

      if (!master) {
        await ctx.reply('❌ Error al cargar tu cuenta. Inténtalo de nuevo.');
        return;
      }

      const linkedPlatforms = await getLinkedPlatforms(effectiveId);
      const isMaster = user.id === effectiveId;

      // Construir lista de plataformas
      const allPlatforms = [
        { platform: master.platform as Platform, displayName: master.displayName, isCurrent: master.platform === ctx.platform, isMaster: true },
        ...linkedPlatforms.map(p => ({
          platform: p.platform,
          displayName: p.displayName,
          isCurrent: p.platform === ctx.platform,
          isMaster: false,
        })),
      ];

      const platformList = allPlatforms
        .map(p => {
          const current = p.isCurrent ? ' ← **aquí** ' : '';
          const master2 = p.isMaster ? ' 👑' : '';
          return `  ${PLATFORM_EMOJIS[p.platform]} ${PLATFORM_NAMES[p.platform]}${master2}${current}`;
        })
        .join('\n');

      const linkedCount = linkedPlatforms.length;

      await ctx.reply(
        `🔗 **Tus cuentas vinculadas**\n\n` +
        `**Plataformas (${allPlatforms.length}/3):**\n` +
        `${platformList}\n\n` +
        `👑 = cuenta principal (donde se almacenan los datos)\n\n` +
        `📊 **Stats globales:**\n` +
        `  🪙 Monedas: **${master.balance}**\n` +
        `  ⭐ XP: **${master.xp}** | Nv. **${master.level}**\n` +
        `  🔞 Adulto: ${master.isVerifiedAdult ? 'Verificado ✅' : 'No verificado'}\n\n` +
        (linkedCount < 2
          ? `💡 Aún puedes vincular más plataformas con \`/linkcode\``
          : `✅ ¡Tienes todas las plataformas vinculadas!`)
      );
    },
  },

  // ── /unlink ──────────────────────────────────────────────────
  {
    name: 'unlink',
    aliases: ['desvincular'],
    description: 'Desvincula tu cuenta de esta plataforma (avanzado)',
    category: 'utility',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName, ctx.username);

      // Si no está vinculada, no hay nada que hacer
      if (!user.linkedToUserId) {
        await ctx.reply(
          `ℹ️ Tu cuenta en ${PLATFORM_NAMES[ctx.platform]} no está vinculada a ninguna otra plataforma.\n\n` +
          `Usa \`/link\` para vincularla.`
        );
        return;
      }

      // Confirmación (patrón simple: args[0] debe ser "confirmar")
      if (ctx.args[0]?.toLowerCase() !== 'confirmar') {
        await ctx.reply(
          `⚠️ **¿Seguro que quieres desvincular esta cuenta?**\n\n` +
          `• Tu cuenta en ${PLATFORM_EMOJIS[ctx.platform]} ${PLATFORM_NAMES[ctx.platform]} ` +
          `se separará de la cuenta principal.\n` +
          `• **No perderás tu saldo ni XP** (empezarás con los que tenías antes de vincular, desde cero aquí).\n` +
          `• Perderás la **verificación +18** si la obtuviste en otra plataforma.\n\n` +
          `Para confirmar, escribe:\n\`/unlink confirmar\``
        );
        return;
      }

      // Desvincular
      await db.update(users)
        .set({ linkedToUserId: null })
        .where(eq(users.id, user.id));

      await ctx.reply(
        `✅ Cuenta desvinculada en ${PLATFORM_EMOJIS[ctx.platform]} ${PLATFORM_NAMES[ctx.platform]}.\n\n` +
        `Tu cuenta aquí ahora es independiente.\n` +
        `Si quieres volver a vincularla, usa \`/link\`.`
      );
    },
  },
];
