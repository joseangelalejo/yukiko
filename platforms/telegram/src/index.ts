import { Bot, Context } from 'grammy';
import { registry } from '@yukiko/core/src/registry';
import { db, knownContacts } from '@yukiko/db';
import { eq, and } from 'drizzle-orm';
import { roleplayCommands } from '@yukiko/roleplay';
import { economyCommands } from '@yukiko/economy';
import { adultCommands } from '@yukiko/adult';
import { aiCommands } from '@yukiko/ai';
import { moderationCommands } from '@yukiko/moderation';
import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';
import { isOnCooldown, remainingCooldown, addXp, logCommand } from '@yukiko/core/src/utils';
import { checkAdultVerificationNotifications } from '@yukiko/core/src/notifications';
import type { CommandContext } from '@yukiko/core/src/types';
import 'dotenv/config';

// ── Register all commands ────────────────────────────────────
[
  ...roleplayCommands,
  ...economyCommands,
  ...adultCommands,
  ...aiCommands,
  ...moderationCommands,
  ...linkCommands,           // ← nuevo
].forEach(cmd => registry.register(cmd));

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

// ── Build context from Telegram update ──────────────────────
function buildContext(ctx: Context, commandName: string, args: string[]): CommandContext {
  const userId = String(ctx.from?.id ?? '');
  const chatId = String(ctx.chat?.id ?? '');
  const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
  const isAdmin = false;
  const displayName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Usuario';

  return {
    platform: 'telegram',
    userId,
    chatId,
    groupId: isGroup ? chatId : undefined,
    username: ctx.from?.username,
    displayName,
    isAdmin,
    isGroup,
    args,
    rawText: args.join(' '),
    reply: async (text: string) => {
      await ctx.reply(text, { parse_mode: 'Markdown' });
    },
    replyWithImage: async (url: string, caption?: string) => {
      await ctx.replyWithPhoto(url, { caption, parse_mode: 'Markdown' });
    },
    replyWithGif: async (url: string, caption?: string) => {
      await ctx.replyWithAnimation(url, { caption, parse_mode: 'Markdown' });
    },
    // En Telegram el DM se envía al chat del usuario (si está en privado ya es DM)
    replyDM: async (text: string) => {
      const userId2 = ctx.from?.id;
      if (userId2) {
        await bot.api.sendMessage(userId2, text, { parse_mode: 'Markdown' });
      }
    },
  };
}

// ── /start — onboarding ───────────────────────────────────────
bot.command('start', async (ctx) => {
  const userId = String(ctx.from?.id ?? '');
  const displayName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Usuario';
  const username = ctx.from?.username;

  const { isNew } = await handleNewUser(userId, 'telegram', displayName, username);

  // Verificar si es un contacto conocido (DM solo)
  if (ctx.chat?.type === 'private' && isNew) {
    const [existing] = await db
      .select()
      .from(knownContacts)
      .where(
        and(
          eq(knownContacts.platformId, userId),
          eq(knownContacts.platform, 'telegram')
        )
      )
      .limit(1);

    if (!existing) {
      // Nuevo contacto — guardar
      await db.insert(knownContacts).values({
        platformId: userId,
        platform: 'telegram',
        targetPlatformId: userId,
        targetDisplayName: displayName,
      });
    }
  }

  if (isNew) {
    // Usuario nuevo → mostrar onboarding con opción de vincular
    await ctx.reply(buildOnboardingMessage('telegram', displayName), { parse_mode: 'Markdown' });
  } else {
    // Usuario conocido → bienvenida breve
    await ctx.reply(
      `🌨️ **¡Hola de nuevo, ${displayName}!** 🐱\n\n` +
      `Usa /help para ver los comandos disponibles.\n` +
      `Usa /accounts para ver tus plataformas vinculadas.`,
      { parse_mode: 'Markdown' }
    );
  }
});


async function wakeHomelabIfNeeded(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.HOMELAB_AGENT_URL}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    try {
      await fetch('https://wol.juanje.net/wake/proxmox.miniserver.online', {
        signal: AbortSignal.timeout(5000),
      });
      console.log('🔌 WoL enviado a proxmox.miniserver.online');
    } catch (e) {
      console.error('❌ Error enviando WoL:', e);
    }
    return false;
  }
}
// ── Command handler factory ───────────────────────────────────
function setupCommand(commandName: string) {
  bot.command(commandName, async (ctx) => {
    const command = registry.get(commandName);
    if (!command) return;

    const homelabOnline = await wakeHomelabIfNeeded();
    if (!homelabOnline) {
      await ctx.reply('😴 Mi servidor está apagado, lo estoy encendiendo... Inténtalo de nuevo en unos minutos.');
      return;
    }

    const text = ctx.message?.text ?? '';
    const userId = String(ctx.from?.id ?? '');
    const args = text.split(' ').slice(1);
    const displayName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Usuario';

    // Onboarding silencioso si no es /link o /linkcode
    if (commandName !== 'link' && commandName !== 'linkcode' && commandName !== 'start') {
      const { isNew } = await handleNewUser(userId, 'telegram', displayName, ctx.from?.username);
      if (isNew) {
        // Enviar onboarding por DM (o en el mismo chat si es privado)
        const onboardingMsg = buildOnboardingMessage('telegram', displayName);
        if (ctx.chat?.type === 'private') {
          await ctx.reply(onboardingMsg, { parse_mode: 'Markdown' });
        } else {
          try {
            await bot.api.sendMessage(Number(userId), onboardingMsg, { parse_mode: 'Markdown' });
          } catch {
            // DMs cerrados, skip silencioso
          }
        }
        // Continuar con el comando
      }
    }

    // Cooldown
    if (command.cooldown && await isOnCooldown(userId, commandName, command.cooldown)) {
      const remaining = await remainingCooldown(userId, commandName, command.cooldown);
      await ctx.reply(`⏰ Espera *${remaining}s* antes de usar este comando.`, { parse_mode: 'Markdown' });
      return;
    }

    const yukikoCtx = buildContext(ctx, commandName, args);

    try {
      await command.execute(yukikoCtx);
      await addXp(userId, 5);
      await logCommand({ platform: 'telegram', userId, command: commandName, args, success: true });

      // Check for adult verification notifications (DM only)
      if (ctx.chat?.type === 'private') {
        try {
          await checkAdultVerificationNotifications(
            'telegram',
            userId,
            displayName,
            async (msg) => {
              await ctx.reply(msg, { parse_mode: 'Markdown' });
            }
          );
        } catch {}
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      await logCommand({ platform: 'telegram', userId, command: commandName, args, success: false, error: msg });
      await ctx.reply('❌ Error al ejecutar el comando.');
    }
  });
}

// ── Register all commands ────────────────────────────────────
registry.getForPlatform('telegram').forEach(cmd => {
  setupCommand(cmd.name);
  cmd.aliases?.forEach(alias => setupCommand(alias));
});

// ── /help ─────────────────────────────────────────────────────
bot.command('help', async (ctx) => {
  const categories = ['roleplay', 'economy', 'ai', 'moderation', 'adult', 'utility'];
  const categoryEmojis: Record<string, string> = {
    roleplay: '🎭', economy: '💰', ai: '🤖',
    moderation: '🔨', adult: '🔞', utility: '🔧',
  };

  const lines = categories.map(cat => {
    const cmds = registry.getByCategory(cat).map(c => `/${c.name}`).join(' ');
    if (!cmds) return null;
    return `${categoryEmojis[cat] ?? '▸'} *${cat.toUpperCase()}*\n${cmds}`;
  }).filter(Boolean);

  await ctx.reply(lines.join('\n\n'), { parse_mode: 'Markdown' });
});

// ── Start bot ─────────────────────────────────────────────────
bot.start();
console.log('🌨️ Yukiko Telegram bot started');
