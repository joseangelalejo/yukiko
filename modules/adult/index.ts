import type { Command, CommandContext } from '../../core/src/types.js';
import { db, users, groups, adultRequests } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

// ── Gelbooru GIF fetch ────────────────────────────────────────
async function fetchGelbooru(tags: string): Promise<string | null> {
  try {
    const apiKey = process.env.GELBOORU_API_KEY;
    const userId = process.env.GELBOORU_USER_ID;
    const auth = apiKey && userId ? `&api_key=${apiKey}&user_id=${userId}` : '';
    const query = encodeURIComponent(`animated ${tags}`);
    const res = await fetch(
      `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&limit=30&tags=${query}${auth}`
    );
    const data = await res.json() as { post?: Array<{ file_url: string }> };
    const posts = data.post ?? [];
    if (!posts.length) return null;
    const random = posts[Math.floor(Math.random() * posts.length)];
    return random.file_url ?? null;
  } catch { return null; }
}

async function fetchDanbooru(tags: string): Promise<string | null> {
  try {
    const login = process.env.DANBOORU_LOGIN;
    const apiKey = process.env.DANBOORU_API_KEY;
    const auth = login && apiKey ? `&login=${login}&api_key=${apiKey}` : '';
    const res = await fetch(
      `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tags + ' rating:explicit')}&limit=30&random=true${auth}`
    );
    const posts = await res.json() as Array<{ file_url?: string; large_file_url?: string }>;
    const valid = posts.filter(p => p.file_url || p.large_file_url);
    if (!valid.length) return null;
    const random = valid[Math.floor(Math.random() * valid.length)];
    return random.large_file_url ?? random.file_url ?? null;
  } catch { return null; }
}

// ── Access guard: request flow ────────────────────────────────
async function checkAdultAccess(ctx: CommandContext): Promise<boolean> {
  if (!ctx.isGroup || !ctx.groupId) {
    await ctx.reply('🔞 El contenido +18 solo está disponible en grupos.');
    return false;
  }

  const group = await db
    .select()
    .from(groups)
    .where(and(eq(groups.platformId, ctx.groupId), eq(groups.platform, ctx.platform)))
    .limit(1);

  if (!group[0]?.adultEnabled) {
    await ctx.reply('🔞 El contenido +18 no está habilitado en este grupo.\nUn admin debe usar /adult on');
    return false;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.platformId, ctx.userId), eq(users.platform, ctx.platform)))
    .limit(1);

  if (!user[0]) {
    await ctx.reply('❌ Primero usa cualquier otro comando para registrarte.');
    return false;
  }

  if (user[0].isVerifiedAdult) return true;

  const [pending] = await db
    .select()
    .from(adultRequests)
    .where(and(eq(adultRequests.platformUserId, ctx.userId), eq(adultRequests.status, 'pending')))
    .limit(1);

  if (pending) {
    await ctx.reply('⏳ Tu solicitud +18 está **pendiente de aprobación**. ¡Ten paciencia! 🌸');
    return false;
  }

  const [rejected] = await db
    .select()
    .from(adultRequests)
    .where(and(eq(adultRequests.platformUserId, ctx.userId), eq(adultRequests.status, 'rejected')))
    .orderBy(adultRequests.requestedAt)
    .limit(1);

  if (rejected) {
    await ctx.reply(
      `❌ Tu solicitud +18 fue rechazada${rejected.rejectionReason ? `: ${rejected.rejectionReason}` : ''}.\n` +
      'Usa /verify18 para volver a solicitar acceso.'
    );
    return false;
  }

  await ctx.reply(
    '🔞 Necesitas verificación de edad.\n\n' +
    'Usa **/verify18** para enviar una solicitud al administrador.\n' +
    'Una vez aprobada tendrás acceso completo.'
  );
  return false;
}

export const adultCommands: Command[] = [
  {
    name: 'verify18',
    aliases: ['solicitar18', 'verificar18', 'requestadult'],
    description: 'Solicita acceso a contenido +18 (el admin lo aprueba)',
    category: 'adult',
    platforms: ['discord', 'telegram', 'whatsapp'],
    execute: async (ctx: CommandContext) => {
      const user = await db
        .select()
        .from(users)
        .where(and(eq(users.platformId, ctx.userId), eq(users.platform, ctx.platform)))
        .limit(1);

      if (!user[0]) {
        await ctx.reply('❌ Primero usa cualquier comando para registrarte.');
        return;
      }

      if (user[0].isVerifiedAdult) {
        await ctx.reply('✅ ¡Ya tienes acceso +18 aprobado!');
        return;
      }

      const [existingPending] = await db
        .select()
        .from(adultRequests)
        .where(and(eq(adultRequests.platformUserId, ctx.userId), eq(adultRequests.status, 'pending')))
        .limit(1);

      if (existingPending) {
        await ctx.reply('⏳ Ya tienes una solicitud pendiente. El admin la revisará pronto.');
        return;
      }

      await db.insert(adultRequests).values({
        userId: user[0].id,
        platform: ctx.platform,
        platformUserId: ctx.userId,
        displayName: ctx.displayName,
        status: 'pending',
      });

      await ctx.reply(
        '📨 **Solicitud enviada correctamente** ✅\n\n' +
        'Al enviar esta solicitud confirmas que:\n' +
        '• Tienes **18 años o más**\n' +
        '• Eres consciente de que accederás a contenido para adultos\n\n' +
        'El administrador revisará tu solicitud y recibirás una notificación. 🌸'
      );
    },
  },

  {
    name: 'adult',
    aliases: ['nsfw'],
    description: 'Activa o desactiva contenido +18 en el grupo',
    category: 'adult',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adminOnly: true,
    groupOnly: true,
    execute: async (ctx: CommandContext) => {
      const action = ctx.args[0]?.toLowerCase();
      if (!['on', 'off'].includes(action ?? '')) {
        await ctx.reply('❌ Uso: /adult on | /adult off');
        return;
      }
      const enable = action === 'on';
      const existing = await db
        .select({ id: groups.id })
        .from(groups)
        .where(and(eq(groups.platformId, ctx.groupId!), eq(groups.platform, ctx.platform)))
        .limit(1);

      if (existing[0]) {
        await db.update(groups).set({ adultEnabled: enable })
          .where(and(eq(groups.platformId, ctx.groupId!), eq(groups.platform, ctx.platform)));
      } else {
        await db.insert(groups).values({
          platformId: ctx.groupId!,
          platform: ctx.platform,
          name: ctx.groupId!,
          adultEnabled: enable,
        });
      }
      await ctx.reply(enable
        ? '🔞 Contenido +18 **activado** en este grupo.'
        : '✅ Contenido +18 **desactivado**.'
      );
    },
  },

  {
    name: 'hentai',
    aliases: ['h'],
    description: 'Imagen hentai aleatoria (requiere verificación +18)',
    category: 'adult',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adultOnly: true,
    cooldown: 5,
    execute: async (ctx: CommandContext) => {
      if (!await checkAdultAccess(ctx)) return;
      const tags = ctx.args.join(' ') || 'anime';
      const url = await fetchDanbooru(tags);
      if (!url) { await ctx.reply('❌ Sin resultados. Intenta otras etiquetas.'); return; }
      await ctx.replyWithImage(url, `🔞 ${tags}`);
    },
  },

  {
    name: 'gif18',
    aliases: ['gelbooru', 'gbgif'],
    description: 'GIF +18 animado via Gelbooru (requiere verificación)',
    category: 'adult',
    platforms: ['discord', 'telegram', 'whatsapp'],
    adultOnly: true,
    cooldown: 5,
    execute: async (ctx: CommandContext) => {
      if (!await checkAdultAccess(ctx)) return;
      const tags = ctx.args.join(' ') || 'hentai';
      const url = await fetchGelbooru(tags);
      if (!url) { await ctx.reply('❌ Sin resultados. Intenta otras etiquetas.'); return; }
      await ctx.replyWithGif(url, `🔞 ${tags}`);
    },
  },
];
