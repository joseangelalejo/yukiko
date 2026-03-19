import type { Command, CommandContext } from '../../core/src/types.js';
import { db, users, transactions, pets, inventory } from '../../db/index.js';
import { eq, desc, and } from 'drizzle-orm';
import { getOrCreateUser, remainingCooldown, setCooldown, resolveEffectiveUser } from '../../core/src/utils.js';

const DAILY_AMOUNT = 100;
const DAILY_COOLDOWN = 86400; // 24 horas en segundos

export const economyCommands: Command[] = [
  // ── Balance ────────────────────────────────────────────────
  {
    name: 'balance',
    aliases: ['bal', 'saldo', 'monedas'],
    description: 'Muestra tu balance de monedas y nivel',
    category: 'economy',
    platforms: ['discord', 'telegram'],
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
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const remaining = await remainingCooldown(ctx.userId, 'daily', DAILY_COOLDOWN, ctx.platform);

      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        await ctx.reply(`⏰ Ya reclamaste tu recompensa hoy. Vuelve en **${hours}h ${minutes}m**`);
        return;
      }

      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const effective = await resolveEffectiveUser(user.id);
      if (!effective) {
        await ctx.reply('❌ Error al obtener tu usuario.');
        return;
      }

      await db.update(users).set({ balance: effective.balance + DAILY_AMOUNT }).where(eq(users.id, effective.id));
      await setCooldown(effective.id, 'daily', DAILY_COOLDOWN);

      await ctx.reply(`✅ ¡Reclamaste **${DAILY_AMOUNT}** 🪙! Tu nuevo saldo: **${effective.balance + DAILY_AMOUNT}** 🪙`);
    },
  },

  // ── Transfer ───────────────────────────────────────────────
  {
    name: 'transfer',
    aliases: ['transferir', 'dar', 'send'],
    description: 'Transfiere monedas a otro usuario',
    category: 'economy',
    platforms: ['discord', 'telegram'],
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

      const mentionClean = mention.replace(/^@/, '');
      const [receiver] = await db
        .select()
        .from(users)
        .where(and(eq(users.platform, ctx.platform), eq(users.displayName, mentionClean)))
        .limit(1);

      if (!receiver) {
        await ctx.reply(`❌ No se encontró al usuario **${mention}** en ${ctx.platform}.`);
        return;
      }

      if (receiver.id === sender.id) {
        await ctx.reply('❌ No puedes transferirte monedas a ti mismo.');
        return;
      }

      await db.update(users).set({ balance: sender.balance - amount }).where(eq(users.id, sender.id));
      await db.update(users).set({ balance: receiver.balance + amount }).where(eq(users.id, receiver.id));
      await db.insert(transactions).values({
        fromUserId: sender.id,
        toUserId: receiver.id,
        amount,
        reason: 'transfer',
      });
      await ctx.reply(`✅ Transferiste **${amount}** 🪙 a **${receiver.displayName}**`);
    },
  },

  // ── Top / Ranking ──────────────────────────────────────────
  {
    name: 'top',
    aliases: ['ranking', 'leaderboard', 'tabla'],
    description: 'Muestra el ranking global de monedas',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const top = await db.select().from(users).orderBy(desc(users.balance)).limit(10);
      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((u, i) => {
        const medal = medals[i] ?? `${i + 1}.`;
        return `${medal} **${u.displayName}** — ${u.balance} 🪙 (Lv.${u.level})`;
      });
      await ctx.reply(`🏆 **Ranking Global**\n\n${lines.join('\n')}`);
    },
  },

  // ── Levels ────────────────────────────────────────────────
  {
    name: 'levels',
    aliases: ['niveles', 'xptop'],
    description: 'Ranking de niveles y XP',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const top = await db.select().from(users).orderBy(desc(users.xp)).limit(10);
      const lines = top.map((u, i) => `${i + 1}. **${u.displayName}** — Lv.${u.level} (${u.xp} XP)`);
      await ctx.reply(`⭐ **Ranking de Niveles**\n\n${lines.join('\n')}`);
    },
  },

  // ── Shop ───────────────────────────────────────────────────
  {
    name: 'shop',
    aliases: ['tienda'],
    description: 'Muestra la tienda de items',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const items = getShopItems();
      const lines = items.map(i => `${i.emoji} **${i.name}** — ${i.price} 🪙\n  ${i.description}`);
      await ctx.reply(`🛍️ **Tienda de Yukiko**\n\n${lines.join('\n\n')}\n\nUsa /buy <nombre> para comprar`);
    },
  },

  // ── Buy ────────────────────────────────────────────────────
  {
    name: 'buy',
    aliases: ['comprar'],
    description: 'Compra un item de la tienda',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const itemName = ctx.args[0]?.toLowerCase();
      if (!itemName) {
        await ctx.reply('❌ Uso: /buy <nombre_item>\nVer disponibles con: /shop');
        return;
      }

      const items = getShopItems();
      const item = items.find(i => i.name === itemName);
      if (!item) {
        await ctx.reply(`❌ Item **${itemName}** no existe. Ver /shop`);
        return;
      }

      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const effective = await resolveEffectiveUser(user.id);
      if (!effective) {
        await ctx.reply('❌ Error al obtener tu usuario.');
        return;
      }

      if (effective.balance < item.price) {
        await ctx.reply(`❌ Te faltan **${item.price - effective.balance}** 🪙.`);
        return;
      }

      await db.update(users).set({ balance: effective.balance - item.price }).where(eq(users.id, effective.id));

      const [existing] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.userId, effective.id), eq(inventory.itemId, item.name)))
        .limit(1);

      if (existing) {
        await db.update(inventory).set({ quantity: existing.quantity + 1 }).where(eq(inventory.id, existing.id));
      } else {
        await db.insert(inventory).values({ userId: effective.id, itemId: item.name, quantity: 1 });
      }

      await ctx.reply(`✅ ¡Compraste **${item.emoji} ${item.name}**!\nPagaste: **${item.price}** 🪙`);
    },
  },

  // ── Inventory ──────────────────────────────────────────────
  {
    name: 'inventory',
    aliases: ['inv', 'items', 'mochila'],
    description: 'Muestra tu inventario',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const effective = await resolveEffectiveUser(user.id);
      if (!effective) {
        await ctx.reply('❌ Error al obtener tu usuario.');
        return;
      }

      const items = await db.select().from(inventory).where(eq(inventory.userId, effective.id));
      if (!items.length) {
        await ctx.reply('❌ Tu inventario está vacío.');
        return;
      }

      const shopItems = getShopItems();
      const lines = items
        .map(i => {
          const shop = shopItems.find(s => s.name === i.itemId);
          const emoji = shop?.emoji ?? '📦';
          return `${emoji} **${i.itemId}** — ${i.quantity}x`;
        })
        .join('\n');

      await ctx.reply(`🎒 **Tu Inventario**\n\n${lines}`);
    },
  },

  // ── Clear inventory ────────────────────────────────────────
  {
    name: 'clear',
    aliases: ['limpiar_inv', 'sell_all'],
    description: 'Vende todo tu inventario',
    category: 'economy',
    platforms: ['discord', 'telegram'],
    execute: async (ctx: CommandContext) => {
      const user = await getOrCreateUser(ctx.userId, ctx.platform, ctx.displayName);
      const effective = await resolveEffectiveUser(user.id);
      if (!effective) {
        await ctx.reply('❌ Error al obtener tu usuario.');
        return;
      }

      const items = await db.select().from(inventory).where(eq(inventory.userId, effective.id));
      if (!items.length) {
        await ctx.reply('❌ Tu inventario está vacío.');
        return;
      }

      const shopItems = getShopItems();
      let totalGain = 0;

      for (const item of items) {
        const shopItem = shopItems.find(s => s.name === item.itemId);
        if (shopItem) {
          totalGain += Math.floor(shopItem.price * 0.7);
        }
      }

      await db.delete(inventory).where(eq(inventory.userId, effective.id));
      await db.update(users).set({ balance: effective.balance + totalGain }).where(eq(users.id, effective.id));

      await ctx.reply(`✅ ¡Vendiste todo tu inventario!\nGanaste: **${totalGain}** 🪙`);
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────
function getRank(level: number): string {
  if (level >= 50) return '👑 Leyenda';
  if (level >= 30) return '💎 Diamante';
  if (level >= 20) return '🥇 Oro';
  if (level >= 10) return '🥈 Plata';
  if (level >= 5) return '🥉 Bronce';
  return '🌱 Novato';
}

function getShopItems() {
  return [
    { name: 'vip', emoji: '⭐', price: 500, description: 'Rol VIP exclusivo' },
    { name: 'mascota_gato', emoji: '🐱', price: 300, description: 'Adopta un gatito' },
    { name: 'mascota_perro', emoji: '🐶', price: 300, description: 'Adopta un perrito' },
    { name: 'mascota_dragon', emoji: '🐉', price: 1000, description: 'Dragón legendario' },
    { name: 'xp_boost', emoji: '⚡', price: 200, description: 'Doble XP 1 hora' },
    { name: 'caja_misteriosa', emoji: '📦', price: 150, description: 'Recompensa aleatoria' },
  ];
}
