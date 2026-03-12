import type { Command, CommandContext } from '../../core/src/types.js';
import { db, roleplayCounts, users } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

// ── GIF fetcher ───────────────────────────────────────────────
async function fetchGif(query: string): Promise<string> {
  const key = process.env.TENOR_API_KEY;
  const res = await fetch(
    `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query + ' anime')}&key=${key}&limit=20&contentfilter=medium`
  );
  const data = await res.json() as { results: Array<{ media_formats: { gif: { url: string } } }> };
  const results = data.results;
  if (!results?.length) return '';
  const random = results[Math.floor(Math.random() * results.length)];
  return random.media_formats.gif.url;
}

// ── Update roleplay counter ───────────────────────────────────
async function updateCounter(giverId: string, receiverId: string, action: string) {
  // Increment given for giver
  const giverRow = await db
    .select()
    .from(roleplayCounts)
    .where(and(eq(roleplayCounts.userId, giverId), eq(roleplayCounts.action, action)))
    .limit(1);

  if (giverRow[0]) {
    await db
      .update(roleplayCounts)
      .set({ given: giverRow[0].given + 1 })
      .where(eq(roleplayCounts.id, giverRow[0].id));
  } else {
    await db.insert(roleplayCounts).values({ userId: giverId, action, given: 1, received: 0 });
  }

  // Increment received for receiver
  const receiverRow = await db
    .select()
    .from(roleplayCounts)
    .where(and(eq(roleplayCounts.userId, receiverId), eq(roleplayCounts.action, action)))
    .limit(1);

  if (receiverRow[0]) {
    await db
      .update(roleplayCounts)
      .set({ received: receiverRow[0].received + 1 })
      .where(eq(roleplayCounts.id, receiverRow[0].id));
  } else {
    await db.insert(roleplayCounts).values({ userId: receiverId, action, given: 0, received: 1 });
  }
}

// ── Factory for roleplay commands ─────────────────────────────
type RoleplayAction = {
  name: string;
  aliases?: string[];
  emoji: string;
  gifQuery: string;
  selfText: string;   // e.g. "te da un abrazo a"
  caption: (giver: string, receiver: string) => string;
};

const ACTIONS: RoleplayAction[] = [
  {
    name: 'hug',
    aliases: ['abrazo', 'abrazar'],
    emoji: '🤗',
    gifQuery: 'anime hug',
    selfText: 'abraza a',
    caption: (g, r) => `${g} abraza a ${r} 💕`,
  },
  {
    name: 'pat',
    aliases: ['palmadita', 'patear'],
    emoji: '👋',
    gifQuery: 'anime head pat',
    selfText: 'le da palmaditas a',
    caption: (g, r) => `${g} le da palmaditas a ${r} 😊`,
  },
  {
    name: 'kiss',
    aliases: ['beso', 'besar'],
    emoji: '💋',
    gifQuery: 'anime kiss',
    selfText: 'besa a',
    caption: (g, r) => `${g} besa a ${r} 😘`,
  },
  {
    name: 'slap',
    aliases: ['bofetada', 'golpear'],
    emoji: '👋',
    gifQuery: 'anime slap',
    selfText: 'abofetea a',
    caption: (g, r) => `${g} abofetea a ${r} 😤`,
  },
  {
    name: 'cuddle',
    aliases: ['acurrucar'],
    emoji: '🥰',
    gifQuery: 'anime cuddle',
    selfText: 'se acurruca con',
    caption: (g, r) => `${g} se acurruca con ${r} 🥰`,
  },
  {
    name: 'poke',
    aliases: ['pinchar'],
    emoji: '👉',
    gifQuery: 'anime poke',
    selfText: 'pincha a',
    caption: (g, r) => `${g} pincha a ${r} 👉`,
  },
  {
    name: 'bite',
    aliases: ['morder'],
    emoji: '😬',
    gifQuery: 'anime bite',
    selfText: 'muerde a',
    caption: (g, r) => `${g} muerde a ${r} 😬`,
  },
  {
    name: 'lick',
    aliases: ['lamer'],
    emoji: '👅',
    gifQuery: 'anime lick',
    selfText: 'lame a',
    caption: (g, r) => `${g} lame a ${r} 👅`,
  },
  {
    name: 'wave',
    aliases: ['saludar'],
    emoji: '👋',
    gifQuery: 'anime wave hello',
    selfText: 'saluda a',
    caption: (g, r) => `${g} saluda a ${r} 👋`,
  },
  {
    name: 'highfive',
    aliases: ['chocar'],
    emoji: '✋',
    gifQuery: 'anime high five',
    selfText: 'choca los cinco con',
    caption: (g, r) => `${g} choca los cinco con ${r} ✋`,
  },
  {
    name: 'dance',
    aliases: ['bailar'],
    emoji: '💃',
    gifQuery: 'anime dance',
    selfText: 'baila con',
    caption: (g, r) => `${g} baila con ${r} 💃`,
  },
  {
    name: 'feed',
    aliases: ['alimentar'],
    emoji: '🍡',
    gifQuery: 'anime feeding',
    selfText: 'alimenta a',
    caption: (g, r) => `${g} le da de comer a ${r} 🍡`,
  },
];

function makeRoleplayCommand(action: RoleplayAction): Command {
  return {
    name: action.name,
    aliases: action.aliases,
    description: `Realiza la acción ${action.name} con otro usuario`,
    category: 'roleplay',
    platforms: ['discord', 'telegram', 'whatsapp'],
    cooldown: 3,
    execute: async (ctx: CommandContext) => {
      const mention = ctx.args[0];
      if (!mention) {
        await ctx.reply(`❌ Debes mencionar a alguien. Ej: /${action.name} @usuario`);
        return;
      }

      const gifUrl = await fetchGif(action.gifQuery);
      const caption = action.caption(ctx.displayName, mention);

      if (gifUrl) {
        await ctx.replyWithGif(gifUrl, caption);
      } else {
        await ctx.reply(`${action.emoji} ${caption}`);
      }

      // Update counters if we can resolve the target user
      // (Platform-specific user resolution happens in each platform adapter)
    },
  };
}

export const roleplayCommands: Command[] = ACTIONS.map(makeRoleplayCommand);
