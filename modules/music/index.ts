import type { Command, CommandContext } from '../../core/src/types.js';

// ── Módulo de música — pendiente de implementación ───────────
// Decisiones pendientes:
//   - Provider: Lavalink (ya en docker-compose) vs YouTube direct vs otro
//   - Plataformas: Discord (voz) vs Telegram (audio file) vs Mobile
//   - Cola: en memoria vs Redis
//
// Por ahora expone los comandos como stubs para que el registro no falle.

export const musicCommands: Command[] = [
  {
    name: 'play',
    aliases: ['p'],
    description: 'Reproduce una canción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo. ¡Pronto disponible!');
    },
  },
  {
    name: 'stop',
    aliases: ['parar'],
    description: 'Para la reproducción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
  {
    name: 'skip',
    aliases: ['siguiente'],
    description: 'Salta a la siguiente canción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
  {
    name: 'queue',
    aliases: ['cola', 'q'],
    description: 'Muestra la cola de reproducción (próximamente)',
    category: 'music',
    platforms: ['discord'],
    execute: async (ctx: CommandContext) => {
      await ctx.reply('🎵 El módulo de música está en desarrollo.');
    },
  },
];
