import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { registry } from '@yukiko/core/src/registry';
import { db, knownContacts } from '@yukiko/db';
import { eq, and } from 'drizzle-orm';
import { roleplayCommands } from '@yukiko/roleplay';
import { economyCommands } from '@yukiko/economy';
import { adultCommands } from '@yukiko/adult';
import { aiCommands } from '@yukiko/ai';
import { moderationCommands } from '@yukiko/moderation';
import { linkCommands, handleNewUser } from '@yukiko/link';
import { isOnCooldown, remainingCooldown, addXp, logCommand } from '@yukiko/core/src/utils';
import { checkAdultVerificationNotifications } from '@yukiko/core/src/notifications';
import type { CommandContext } from '@yukiko/core/src/types';
import { mkdir } from 'fs/promises';
import 'dotenv/config';

[
  ...roleplayCommands,
  ...economyCommands,
  ...adultCommands,
  ...aiCommands,
  ...moderationCommands,
  ...linkCommands,
].forEach(cmd => registry.register(cmd));

const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH ?? './sessions/whatsapp';
const PREFIX = '/';
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
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Pairing code ─────────────────────────────────────────
  if (!state.creds.registered) {
    const phone = process.env.WHATSAPP_PHONE ?? '';
    if (!phone) { console.error('Pon WHATSAPP_PHONE en el .env'); process.exit(1); }

    let pairingRequested = false;

    await new Promise<void>(resolve => {
      sock.ev.on('connection.update', async (update) => {
        if ((update.qr || update.connection === 'connecting') && !pairingRequested) {
          pairingRequested = true;
          try {
            await new Promise(r => setTimeout(r, 3000)); // esperar 3s a que el socket esté listo
            const pairingCode = await sock.requestPairingCode(phone);
            console.log('\n########################################');
            console.log('#      CODIGO DE VINCULACION WA        #');
            console.log('#                                      #');
            console.log(`#          ${pairingCode}              #`);
            console.log('#                                      #');
            console.log('########################################\n');
            console.log('Tienes 60 segundos para introducirlo en WhatsApp.');
          } catch(e) {
            console.error('Error al pedir pairing code:', e);
            pairingRequested = false;
          }
        }
        if (update.connection === 'open') {
          console.log('🌨️ Yukiko WhatsApp connected!');
          resolve();
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

  async function sendDM(phone: string, text: string) {
    const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
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

  const startupTime = Date.now();
  const STARTUP_GRACE_MS = 15_000;

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      const msgTimestamp = (msg.messageTimestamp as number) * 1000;
      if (msgTimestamp < startupTime - STARTUP_GRACE_MS) continue;

      const body =
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        '';

      const jid = msg.key.remoteJid ?? '';
      const isGroup = jid.endsWith('@g.us');
      const senderId = msg.key.participant ?? msg.key.remoteJid ?? '';
      const userId = senderId.replace('@s.whatsapp.net', '');
      const displayName = msg.pushName ?? userId;

      // Registrar usuario silenciosamente sin enviar onboarding
      if (!onboardedThisSession.has(userId)) {
        onboardedThisSession.add(userId);
        await handleNewUser(userId, 'whatsapp', displayName);

        // Verificar si es un contacto conocido
        // Si no, guardarlo y enviar bienvenida
        if (!isGroup) {
          const [existing] = await db
            .select()
            .from(knownContacts)
            .where(
              and(
                eq(knownContacts.platformId, userId),
                eq(knownContacts.platform, 'whatsapp')
              )
            )
            .limit(1);

          if (!existing) {
            // Nuevo contacto — guardar y enviar bienvenida
            await db.insert(knownContacts).values({
              platformId: userId,
              platform: 'whatsapp',
              targetPlatformId: userId,
              targetDisplayName: displayName,
            });

            await sock.sendMessage(jid, {
              text: `¡Hola *${displayName}*! 👋\n\nSoy *Yukiko*, un bot multi-plataforma 🌨️\n\nUsa */help* para ver todos mis comandos.\n\n🎮 Puedo:\n• Juegos de rol\n• Sistema de economía\n• Contenido +18\n• IA\n• Y mucho más...\n\n¡Bienvenido/a!`,
            });
          }
        }
      }

      if (!body.startsWith(PREFIX)) continue;

      // Verificar si el homelab está activo; si no, despertar y avisar
      const homelabOnline = await wakeHomelabIfNeeded();
      if (!homelabOnline) {
        await sock.sendMessage(jid, {
          text: '😴 Mi servidor está apagado, lo estoy encendiendo... Inténtalo de nuevo en unos minutos.',
        }, { quoted: msg });
        continue;
      }

      const [commandStr, ...args] = body.slice(PREFIX.length).trim().split(/\s+/);
      const commandName = commandStr.toLowerCase();
      const command = registry.get(commandName);
      if (!command) continue;

      if (command.cooldown && await isOnCooldown(userId, commandName, command.cooldown)) {
        const remaining = await remainingCooldown(userId, commandName, command.cooldown);
        await sock.sendMessage(jid, {
          text: `⏰ Espera *${remaining}s* antes de usar este comando.`,
        }, { quoted: msg });
        continue;
      }

      // Resolver isAdmin
      let isAdmin = false;
      if (isGroup) {
        try {
          const meta = await sock.groupMetadata(jid);
          isAdmin = meta.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .some(p => p.id === senderId);
        } catch { isAdmin = false; }
      }

      const ctx: CommandContext = {
        platform: 'whatsapp',
        userId,
        chatId: jid,
        groupId: isGroup ? jid : undefined,
        displayName,
        isAdmin,
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
        await addXp(userId, 5, 'whatsapp');
        await logCommand({ platform: 'whatsapp', userId, command: commandName, args, success: true });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error';
        await logCommand({ platform: 'whatsapp', userId, command: commandName, args, success: false, error: errMsg });
        await sock.sendMessage(jid, { text: '❌ Error al ejecutar el comando.' }, { quoted: msg });
      }
      if (!isGroup) {
        checkAdultVerificationNotifications(
          'whatsapp', userId, displayName,
          async (notifMsg) => { await sock.sendMessage(jid, { text: notifMsg }); }
        ).catch(() => {});
      }
    }
  });
}

startWhatsApp().catch(console.error);
