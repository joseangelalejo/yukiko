import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { registry } from '@yukiko/core/src/registry';
import { roleplayCommands } from '@yukiko/roleplay';
import { economyCommands } from '@yukiko/economy';
import { adultCommands } from '@yukiko/adult';
import { aiCommands } from '@yukiko/ai';
import { moderationCommands } from '@yukiko/moderation';
import { linkCommands, handleNewUser } from '@yukiko/link';
import { getOrCreateUser, isOnCooldown, remainingCooldown, setCooldown, addXp, logCommand } from '@yukiko/core/src/utils';
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
  ...linkCommands,
].forEach(cmd => registry.register(cmd));

// ── Types ────────────────────────────────────────────────────
interface MobileSession {
  ws: WebSocket;
  userId: string;       // internal UUID
  platformId: string;   // mobile user ID
  displayName: string;
  username?: string;
  isVerifiedAdult: boolean;
}

interface ClientMessage {
  type: 'command' | 'ping' | 'auth';
  command?: string;
  args?: string[];
  token?: string;       // JWT or simple token for auth
  displayName?: string;
  username?: string;
}

interface ServerMessage {
  type: 'message' | 'image' | 'gif' | 'error' | 'pong' | 'auth_ok' | 'auth_fail';
  text?: string;
  url?: string;
  caption?: string;
  command?: string;
}

// ── Active sessions ──────────────────────────────────────────
const sessions = new Map<WebSocket, MobileSession>();

// ── Send helper ──────────────────────────────────────────────
function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ── Build CommandContext from session ────────────────────────
function buildContext(session: MobileSession, args: string[], ws: WebSocket): CommandContext {
  return {
    platform: 'mobile' as any,
    userId: session.platformId,
    chatId: session.platformId,
    username: session.username,
    displayName: session.displayName,
    isAdmin: false,
    isGroup: false,
    args,
    rawText: args.join(' '),
    reply: async (text: string) => {
      send(ws, { type: 'message', text });
    },
    replyWithImage: async (url: string, caption?: string) => {
      send(ws, { type: 'image', url, caption });
    },
    replyWithGif: async (url: string, caption?: string) => {
      send(ws, { type: 'gif', url, caption });
    },
    replyDM: async (text: string) => {
      send(ws, { type: 'message', text });
    },
  };
}

// ── Handle message ───────────────────────────────────────────
async function handleMessage(ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    send(ws, { type: 'error', text: 'Invalid JSON' });
    return;
  }

  // Ping
  if (msg.type === 'ping') {
    send(ws, { type: 'pong' });
    return;
  }

  // Auth
  if (msg.type === 'auth') {
    if (!msg.token || !msg.displayName) {
      send(ws, { type: 'auth_fail', text: 'Missing token or displayName' });
      return;
    }
    try {
      const user = await getOrCreateUser(msg.token, 'mobile' as any, msg.displayName, msg.username);
      const session: MobileSession = {
        ws,
        userId: user.id,
        platformId: msg.token,
        displayName: msg.displayName,
        username: msg.username,
        isVerifiedAdult: user.isVerifiedAdult,
      };
      sessions.set(ws, session);
      send(ws, { type: 'auth_ok', text: `Bienvenido/a, ${msg.displayName}! 🌨️` });

      // Check adult verification notifications
      checkAdultVerificationNotifications(
        'mobile' as any, msg.token, msg.displayName,
        async (text) => send(ws, { type: 'message', text })
      ).catch(() => {});

      // Onboarding
      const onboarding = await handleNewUser(msg.token, 'mobile' as any, msg.displayName, msg.username);
      if (onboarding.isNew) {
        send(ws, { type: 'message', text: '¡Bienvenido/a a Yukiko! 🌸 Usa /help para ver los comandos disponibles.' });
      }
    } catch (err) {
      console.error('[Mobile AUTH ERROR]', err);
      send(ws, { type: 'auth_fail', text: 'Error al autenticar' });
    }
    return;
  }

  // Command — require auth
  if (msg.type === 'command') {
    const session = sessions.get(ws);
    if (!session) {
      send(ws, { type: 'error', text: 'No autenticado. Envía auth primero.' });
      return;
    }

    const commandName = msg.command?.toLowerCase() ?? '';
    const args = msg.args ?? [];

    const command = registry.get(commandName) ?? registry.getByAlias(commandName);
    if (!command) {
      send(ws, { type: 'error', text: `Comando desconocido: /${commandName}` });
      return;
    }

    if (!command.platforms.includes('mobile' as any) && !command.platforms.includes('telegram')) {
      send(ws, { type: 'error', text: `El comando /${commandName} no está disponible en mobile.` });
      return;
    }

    // Cooldown
    if (command.cooldown && await isOnCooldown(session.platformId, commandName, command.cooldown, 'mobile' as any)) {
      const remaining = await remainingCooldown(session.platformId, commandName, command.cooldown, 'mobile' as any);
      send(ws, { type: 'message', text: `⏰ Espera **${remaining}s** antes de usar este comando.` });
      return;
    }

    const ctx = buildContext(session, args, ws);

    try {
      await command.execute(ctx);
      await addXp(session.platformId, 5, 'mobile' as any);
      await logCommand({ platform: 'mobile' as any, userId: session.platformId, command: commandName, args, success: true });
      if (command.cooldown) {
        await setCooldown(session.platformId, commandName, command.cooldown, 'mobile' as any);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Mobile ERROR] /${commandName}`, err);
      await logCommand({ platform: 'mobile' as any, userId: session.platformId, command: commandName, args, success: false, error: errMsg });
      send(ws, { type: 'error', text: '❌ Ocurrió un error al ejecutar el comando.' });
    }
  }
}

// ── WebSocket Server ─────────────────────────────────────────
const PORT = parseInt(process.env.MOBILE_WS_PORT ?? '3002');
const SECRET = process.env.ADMIN_SECRET;

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, connections: sessions.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Optional: IP-level auth via header
  console.log(`[Mobile] New connection from ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    const session = sessions.get(ws);
    if (session) {
      console.log(`[Mobile] Disconnected: ${session.displayName}`);
      sessions.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('[Mobile WS Error]', err);
    sessions.delete(ws);
  });

  // Welcome
  send(ws, { type: 'message', text: '🌨️ Conectado a Yukiko Mobile. Envía auth para continuar.' });
});

server.listen(PORT, () => {
  console.log(`🌨️ Yukiko Mobile WebSocket server en puerto ${PORT}`);
});
