import type { Command, CommandContext } from '../../core/src/types.js';
import { db, users, transactions, pets } from '../../db/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { getOrCreateUser } from '../../core/src/utils.js';

const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// In-memory daily cooldown (replace with Redis in production)
const dailyCooldowns = new Map<string, number>();

export const economyCommands: Command[] = [
  // ── Balance ────────────────────────────────────────────────
  {
    name: 'balance',
    aliases: ['bal', 'saldo', 'monedas'],
    description: 'Muestra tu balance de monedas y nivel',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const xpNeeded = Math.floor(100 * Math.pow(1.5, user.level));
      await ctx.reply(
        `💰 **${ctx.displayName}**\n` +
        `Monedas: **${user.balance}** 🪙\n` +
        `Nivel: **${user.level}** | XP: ${user.xp}/${xpNeeded}\n` +
        `Rango: ${getRank(user.level)}`
      );
    },
  },

  // ── Daily ──────────────────────────────────────────────────
  {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Reclama tu recompensa diaria de monedas',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const last = dailyCooldowns.get(ctx.userId) ?? 0;
      const remaining = DAILY_COOLDOWN_MS - (Date.now() - last);

      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        await ctx.reply(`⏰ Ya reclamaste tu recompensa hoy. Vuelve en **${hours}h ${minutes}m**`);
        return;
      }

      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      await db.update(users).set({ balance: user.balance + DAILY_AMOUNT }).where(eq(users.id, user.id));
      dailyCooldowns.set(ctx.userId, Date.now());

      await ctx.reply(`✅ ¡Reclamaste **${DAILY_AMOUNT}** 🪙! Tu nuevo saldo: **${user.balance + DAILY_AMOUNT}** 🪙`);
    },
  },

  // ── Transfer ───────────────────────────────────────────────
  {
    name: 'transfer',
    aliases: ['transferir', 'dar', 'send'],
    description: 'Transfiere monedas a otro usuario',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const [mention, amountStr] = ctx.args;
      const amount = parseInt(amountStr);

      if (!mention || isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Uso: /transfer @usuario <cantidad>');
        return;
      }

      const sender = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      if (sender.balance < amount) {
        await ctx.reply(`❌ No tienes suficientes monedas. Saldo: **${sender.balance}** 🪙`);
        return;
      }

      await db.update(users).set({ balance: sender.balance - amount }).where(eq(users.id, sender.id));
      // Note: receiver lookup happens in platform adapters
      await ctx.reply(`✅ Transferiste **${amount}** 🪙 a ${mention}`);
    },
  },

  // ── Top / Ranking ──────────────────────────────────────────
  {
    name: 'top',
    aliases: ['ranking', 'leaderboard', 'tabla'],
    description: 'Muestra el ranking global de monedas',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const top = await db
        .select()
        .from(users)
        .orderBy(desc(users.balance))
        .limit(10);

      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((u, i) => {
        const medal = medals[i] ?? `${i + 1}.`;
        return `${medal} **${u.displayName}** — ${u.balance} 🪙 (Lv.${u.level})`;
      });

      await ctx.reply(`🏆 **Ranking Global**\n\n${lines.join('\n')}`);
    },
  },

  // ── Shop ───────────────────────────────────────────────────
  {
    name: 'shop',
    aliases: ['tienda'],
    description: 'Muestra la tienda de items',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const items = getShopItems();
      const lines = items.map(i => `${i.emoji} **${i.name}** — ${i.price} 🪙\n  ${i.description}`);
      await ctx.reply(`🛍️ **Tienda de Yukiko**\n\n${lines.join('\n\n')}\n\nUsa /buy <nombre> para comprar`);
    },
  },

  // ── XP Top ────────────────────────────────────────────────
  {
    name: 'levels',
    aliases: ['niveles', 'xptop'],
    description: 'Ranking de niveles y XP',
    category: 'economy',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const top = await db.select().from(users).orderBy(desc(users.xp)).limit(10);
      const lines = top.map((u, i) => `${i + 1}. **${u.displayName}** — Lv.${u.level} (${u.xp} XP)`);
      await ctx.reply(`⭐ **Ranking de Niveles**\n\n${lines.join('\n')}`);
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────
function getRank(level: number): string {
  if (level >= 50) return '👑 Leyenda';
  if (level >= 30) return '💎 Diamante';
  if (level >= 20) return '🥇 Oro';
  if (level >= 10) return '🥈 Plata';
  if (level >= 5)  return '🥉 Bronce';
  return '🌱 Novato';
}

function getShopItems() {
  return [
    { name: 'vip', emoji: '⭐', price: 500, description: 'Rol VIP exclusivo' },
    { name: 'mascota_gato', emoji: '🐱', price: 300, description: 'Adopta un gatito' },
    { name: 'mascota_perro', emoji: '🐶', price: 300, description: 'Adopta un perrito' },
    { name: 'mascota_dragon', emoji: '🐉', price: 1000, description: 'Adopta un dragón legendario' },
    { name: 'xp_boost', emoji: '⚡', price: 200, description: 'Doble XP durante 1 hora' },
    { name: 'caja_misteriosa', emoji: '📦', price: 150, description: 'Caja con recompensa aleatoria' },
  ];
}
