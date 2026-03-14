import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  DMChannel,
} from 'discord.js';
import { registry } from '@yukiko/core/src/registry.ts';
import { roleplayCommands } from '@yukiko/roleplay';
import { economyCommands } from '@yukiko/economy';
import { adultCommands } from '@yukiko/adult';
import { aiCommands } from '@yukiko/ai';
import { moderationCommands } from '@yukiko/moderation';
import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';
import { getOrCreateUser, isOnCooldown, remainingCooldown, addXp, logCommand } from '@yukiko/core/src/utils.ts';
import { checkAdultVerificationNotifications } from '@yukiko/core/src/notifications';
import type { CommandContext } from '@yukiko/core/src/types.ts';
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
});

// ── Build context from Discord interaction ───────────────────
function buildContext(interaction: ChatInputCommandInteraction, args: string[]): CommandContext {
  const isAdmin = interaction.memberPermissions?.has('Administrator') ?? false;
  const isGroup = (interaction.channel?.type as number) !== (ChannelType.DM as number);

  return {
    platform: 'discord',
    userId: interaction.user.id,
    chatId: interaction.channelId,
    groupId: isGroup ? interaction.guildId ?? undefined : undefined,
    username: interaction.user.username,
    displayName: interaction.member
      ? (interaction.member as { displayName?: string }).displayName ?? interaction.user.username
      : interaction.user.username,
    isAdmin,
    isGroup,
    args,
    rawText: args.join(' '),
    reply: async (text: string) => {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: text });
      } else {
        await interaction.reply({ content: text });
      }
    },
    replyWithImage: async (url: string, caption?: string) => {
      const embed = new EmbedBuilder().setImage(url);
      if (caption) embed.setDescription(caption);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    },
    replyWithGif: async (url: string, caption?: string) => {
      const embed = new EmbedBuilder().setImage(url);
      if (caption) embed.setDescription(caption);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    },
    // DM directo al usuario (para onboarding)
    replyDM: async (text: string) => {
      await interaction.user.send(text);
    },
  };
}

// ── Register slash commands with Discord API ─────────────────
async function registerSlashCommands() {
  const allCommands = registry.getForPlatform('discord');
  const commands = allCommands.map(cmd => {
    const builder = new SlashCommandBuilder()
      .setName(cmd.name)
      .setDescription(cmd.description);

    // Comandos que aceptan argumento de texto libre
    const withArgs = [
      'ask', 'imagine', 'rp', 'translate',
      'hentai', 'redgifs',
      'warn', 'ban', 'unban', 'clear', 'prefix',
      'link',      // ← acepta el código
      'unlink',    // ← acepta "confirmar"
    ];
    if (withArgs.includes(cmd.name)) {
      builder.addStringOption(opt =>
        opt.setName('args').setDescription('Argumentos').setRequired(false)
      );
    }
    if (cmd.name === 'adult') {
      builder.addStringOption(opt =>
        opt.setName('action')
          .setDescription('Activar o desactivar contenido +18')
          .setRequired(true)
          .addChoices(
            { name: 'on', value: 'on' },
            { name: 'off', value: 'off' },
          )
      );
    }

    return builder.toJSON();
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  // Guild commands (instantáneos, para dev) si hay GUILD_ID
  if (process.env.DISCORD_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log(`✅ Discord slash commands registered (guild: ${process.env.DISCORD_GUILD_ID})`);
  } else {
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands }
    );
    console.log('✅ Discord slash commands registered (global)');
  }
}


async function wakeHomelabIfNeeded(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.HOMELAB_AGENT_URL}/api/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) return true;
    fetch('https://wol.juanje.net/wake/proxmox.miniserver.online', {
      signal: AbortSignal.timeout(4000),
    }).then(() => console.log('🔌 WoL enviado')).catch(() => {});
    return false;
  } catch {
    fetch('https://wol.juanje.net/wake/proxmox.miniserver.online', {
      signal: AbortSignal.timeout(4000),
    }).then(() => console.log('🔌 WoL enviado')).catch(() => {});
    return false;
  }
}
// ── Handle interactions ──────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = registry.get(interaction.commandName);
  if (!command) return;

  const homelabOnline = await wakeHomelabIfNeeded();
  if (!homelabOnline) {
    await interaction.reply({ content: '😴 Mi servidor está apagado, lo estoy encendiendo... Inténtalo de nuevo en unos minutos.', flags: 64 });
    return;
  }

  const argsStr = interaction.options.getString('args') ?? '';
  const actionStr = interaction.options.getString('action') ?? '';
  const args = actionStr ? [actionStr, ...argsStr.split(' ').filter(Boolean)] : argsStr.split(' ').filter(Boolean);

  // ── Onboarding: detectar usuario nuevo ──────────────────
  const { isNew } = await handleNewUser(
    interaction.user.id,
    'discord',
    interaction.member
      ? (interaction.member as { displayName?: string }).displayName ?? interaction.user.username
      : interaction.user.username,
    interaction.user.username,
  );

  if (isNew && interaction.commandName !== 'link' && interaction.commandName !== 'linkcode') {
    // Intentar enviar DM con el mensaje de onboarding
    try {
      await interaction.user.send(
        buildOnboardingMessage('discord', interaction.user.username)
      );
    } catch {
      // El usuario tiene DMs cerrados — responder en el canal
      await interaction.reply({
        content: buildOnboardingMessage('discord', interaction.user.username),
        flags: 64,
      });
      return;
    }
    // Continuar igualmente con el comando que activó el onboarding
  }

  // Cooldown check
  if (command.cooldown && await isOnCooldown(interaction.user.id, command.name, command.cooldown, 'discord')) {
    const remaining = await remainingCooldown(interaction.user.id, command.name, command.cooldown, 'discord');
    await interaction.reply({ content: `⏰ Espera **${remaining}s** antes de usar este comando.`, flags: 64 });
    return;
  }

  const ctx = buildContext(interaction, args);

  try {
    await interaction.deferReply();
    await command.execute(ctx);
    await addXp(interaction.user.id, 5, 'discord');
    await logCommand({ platform: 'discord', userId: interaction.user.id, command: command.name, args, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[Discord ERROR]', err);
    await logCommand({ platform: 'discord', userId: interaction.user.id, command: command.name, args, success: false, error: msg });
    if (!interaction.replied) {
      await interaction.editReply('❌ Ocurrió un error al ejecutar el comando.');
    }
  }
  const isDM = (interaction.channel?.type as number) === (ChannelType.DM as number);
  if (isDM) {
    checkAdultVerificationNotifications(
      'discord', interaction.user.id, interaction.user.username,
      async (msg) => { await interaction.user.send(msg); }
    ).catch(() => {});
  }
});

// ── Ready ────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`🌨️ Yukiko Discord ready as ${client.user?.tag}`);
  client.user?.setActivity('con anime 🌸', { type: 0 });
  await registerSlashCommands();
});

client.login(process.env.DISCORD_TOKEN);
