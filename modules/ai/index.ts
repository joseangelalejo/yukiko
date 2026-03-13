import type { Command, CommandContext } from '../../core/src/types.js';

// ── Ollama chat ────────────────────────────────────────────────
async function askOllama(prompt: string, systemPrompt?: string): Promise<string> {
  const res = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL ?? 'llama3.2:3b',
      messages: [
        {
          role: 'system',
          content: systemPrompt ??
            'Eres Yukiko, una bot kawaii y amigable de anime. Responde siempre en español, de forma breve y con personalidad divertida. Usa emojis con moderación.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content.trim();
}

// ── Pollinations image generation ─────────────────────────────
async function generateImage(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(`anime style, ${prompt}`);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`;
}

export const aiCommands: Command[] = [
  // ── AI Chat ────────────────────────────────────────────────
  {
    name: 'ask',
    aliases: ['pregunta', 'ia', 'ai', 'gpt'],
    description: 'Pregúntale algo a Yukiko IA',
    category: 'ai',
    platforms: ['discord', 'telegram', 'whatsapp'],
    cooldown: 5,
    execute: async (ctx: CommandContext) => {
      const prompt = ctx.args.join(' ');
      if (!prompt) {
        await ctx.reply('❌ Uso: /ask <tu pregunta>');
        return;
      }

      await ctx.reply('🤔 Pensando...');
      try {
        const response = await askOllama(prompt);
        await ctx.reply(`🤖 ${response}`);
      } catch (err) {
        await ctx.reply('❌ Hubo un error al consultar la IA. Intenta más tarde.');
      }
    },
  },

  // ── Image generation ───────────────────────────────────────
  {
    name: 'imagine',
    aliases: ['generar', 'dream', 'draw'],
    description: 'Genera una imagen con IA',
    category: 'ai',
    platforms: ['discord', 'telegram', 'whatsapp'],
    cooldown: 30,
    execute: async (ctx: CommandContext) => {
      const prompt = ctx.args.join(' ');
      if (!prompt) {
        await ctx.reply('❌ Uso: /imagine <descripción>');
        return;
      }

      try {
        await ctx.reply('🎨 Generando imagen...');
        const url = await generateImage(prompt);
        await ctx.replyWithImage(url, `🎨 "${prompt}"`);
      } catch (err) {
        await ctx.reply('❌ No se pudo generar la imagen. Intenta con otra descripción.');
      }
    },
  },

  // ── Roleplay AI ───────────────────────────────────────────
  {
    name: 'rp',
    aliases: ['roleplay-ai', 'rpai'],
    description: 'Roleplay con IA como personaje de anime',
    category: 'ai',
    platforms: ['discord', 'telegram', 'whatsapp'],
    cooldown: 10,
    execute: async (ctx: CommandContext) => {
      const text = ctx.args.join(' ');
      if (!text) {
        await ctx.reply('❌ Uso: /rp <acción o diálogo>');
        return;
      }

      const system =
        'Eres Yukiko, una chica neko del mundo anime. Respondes en primera persona, de forma expresiva y kawaii. ' +
        'Interpretas situaciones de roleplay de anime de forma creativa y divertida. ' +
        'Responde siempre en español y mantén el personaje.';

      await ctx.reply('🐱 Yukiko está pensando...');
      try {
        const response = await askOllama(text, system);
        await ctx.reply(`🐱 *${response}*`);
      } catch {
        await ctx.reply('❌ Error en el roleplay IA. Intenta más tarde.');
      }
    },
  },

  // ── Translate ─────────────────────────────────────────────
  {
    name: 'translate',
    aliases: ['traducir', 'tr'],
    description: 'Traduce texto a otro idioma',
    category: 'ai',
    platforms: ['discord', 'telegram', 'whatsapp'],
    cooldown: 5,
    execute: async (ctx: CommandContext) => {
      const [lang, ...words] = ctx.args;
      const text = words.join(' ');
      if (!lang || !text) {
        await ctx.reply('❌ Uso: /translate <idioma> <texto>\nEj: /translate inglés Hola mundo');
        return;
      }

      await ctx.reply('🌐 Traduciendo...');
      try {
        const response = await askOllama(
          `Traduce al ${lang}: "${text}". Responde SOLO con la traducción, sin explicaciones.`
        );
        await ctx.reply(`🌐 **${lang}:** ${response}`);
      } catch {
        await ctx.reply('❌ Error al traducir.');
      }
    },
  },
];
