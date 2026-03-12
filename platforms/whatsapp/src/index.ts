import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { registry } from '@yukiko/core/src/registry.ts';
import { roleplayCommands } from '@yukiko/roleplay';
import { economyCommands } from '@yukiko/economy';
import { adultCommands } from '@yukiko/adult';
import { aiCommands } from '@yukiko/ai';
import { moderationCommands } from '@yukiko/moderation';
import { linkCommands, handleNewUser, buildOnboardingMessage } from '@yukiko/link';
import { isOnCooldown, remainingCooldown, addXp, logCommand } from '@yukiko/core/src/utils.ts';
import type { CommandContext } from '@yukiko/core/src/types.ts';
import { mkdir } from 'fs/promises';
import 'dotenv/config';

// ── Register commands ────────────────────────────────────────
[
  ...roleplayCommands,
  ...economyCommands,
  ...adultCommands,
  ...aiCommands,
  ...moderationCommands,
  ...linkCommands,            // ← nuevo
].forEach(cmd => registry.register(cmd));

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH ?? './sessions/whatsapp';
const PREFIX = '/';

// Tracking de usuarios que ya recibieron el onboarding en esta sesión
// (para no enviar DM cada vez que arranca el proceso)
const onboardedThisSession = new Set<string>();

async function startWhatsApp() {
  await mkdir(SESSION_PATH, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as never),
    },
    generateHighQualityLinkPreview: true,
    usePairingCode: true,
  });

  sock.ev.on('creds.update', saveCreds);
  // ── Pairing code ─────────────────────────────────────────
  if (!state.creds.registered) {
    const phone = process.env.WHATSAPP_PHONE ?? '';
    if (!phone) { console.error('Pon WHATSAPP_PHONE en el .env'); process.exit(1); }
    await new Promise(resolve => {
      sock.ev.on('connection.update', async (update) => {
        if (update.qr || update.connection === 'connecting') {
          try {
            const pairingCode = await sock.requestPairingCode(phone);
            console.log('Codigo de vinculacion WhatsApp: ' + pairingCode);
          } catch(e) { /* reintentara en el proximo ciclo */ }
          resolve(null);
        }
      });
    });
  }

  // ── Connection handling ──────────────────────────────────
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('WhatsApp disconnected. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startWhatsApp();
    } else if (connection === 'open') {
      console.log('🌨️ Yukiko WhatsApp connected!');
    }
  });

  // Helper para enviar DM a un número de WhatsApp
  async function sendDM(phone: string, text: string) {
    // phone = "34612345678" → JID = "34612345678@s.whatsapp.net"
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
  }

  // ── Message handler ──────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;

      const body =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        '';

      const jid = msg.key.remoteJid ?? '';
      const isGroup = jid.endsWith('@g.us');
      const senderId = msg.key.participant ?? msg.key.remoteJid ?? '';
      const userId = senderId.replace('@s.whatsapp.net', '');
      const displayName = msg.pushName ?? userId;

      // ── Onboarding al primer mensaje (con o sin prefijo) ──
      if (!onboardedThisSession.has(userId)) {
        onboardedThisSession.add(userId);

        const { isNew } = await handleNewUser(userId, 'whatsapp', displayName);

        if (isNew) {
          const onboardMsg = buildOnboardingMessage('whatsapp', displayName);

          if (isGroup) {
            // En grupos: enviar DM al usuario
            try {
              await sendDM(userId, onboardMsg);
            } catch {
              // Si falla el DM, enviar en el grupo (menos ideal)
              await sock.sendMessage(jid, { text: onboardMsg });
            }
          } else {
            // En privado: enviar directamente
            await sock.sendMessage(jid, { text: onboardMsg });
          }
          // Continuar — si el mensaje actual tiene un comando, procesarlo igualmente
        }
      }

      // Solo procesar si empieza con el prefijo
      if (!body.startsWith(PREFIX)) continue;

      const [commandStr, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
      const commandName = commandStr.toLowerCase();
      const command = registry.get(commandName);
      if (!command) continue;

      // Cooldown
      if (command.cooldown && isOnCooldown(userId, commandName, command.cooldown)) {
        const remaining = remainingCooldown(userId, commandName, command.cooldown);
        await sock.sendMessage(jid, {
          text: `⏰ Espera *${remaining}s* antes de usar este comando.`,
        }, { quoted: msg });
        continue;
      }

      // Build context
      const ctx: CommandContext = {
        platform: 'whatsapp',
        userId,
        chatId: jid,
        groupId: isGroup ? jid : undefined,
        displayName,
        isAdmin: false,
        isGroup,
        args,
        rawText: args.join(' '),
        reply: async (text: string) => {
          await sock.sendMessage(jid, { text }, { quoted: msg });
        },
        replyWithImage: async (url: string, caption?: string) => {
          const res = await fetch(url);
          const buffer = Buffer.from(await res.arrayBuffer());
          await sock.sendMessage(jid, {
            image: buffer,
            caption: caption ?? '',
            mimetype: 'image/jpeg',
          }, { quoted: msg });
        },
        replyWithGif: async (url: string, caption?: string) => {
          const res = await fetch(url);
          const buffer = Buffer.from(await res.arrayBuffer());
          await sock.sendMessage(jid, {
            video: buffer,
            caption: caption ?? '',
            gifPlayback: true,
          }, { quoted: msg });
        },
        replyDM: async (text: string) => {
          await sendDM(userId, text);
        },
      };

      try {
        await command.execute(ctx);
        await addXp(userId, 5);
        await logCommand({ platform: 'whatsapp', userId, command: commandName, args, success: true });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error';
        await logCommand({ platform: 'whatsapp', userId, command: commandName, args, success: false, error: errMsg });
        await sock.sendMessage(jid, { text: '❌ Error al ejecutar el comando.' }, { quoted: msg });
      }
    }
  });
}

startWhatsApp().catch(console.error);
