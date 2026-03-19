import http from 'http';
import { execSync } from 'child_process';
import { config } from 'dotenv';

config({ path: 'your-home-path/yukiko/.env' });

const SECRET = process.env.ADMIN_SECRET;
const PORT = 3001;
const CWD = 'your-home-path/yukiko';

// ── Ollama ────────────────────────────────────────────────────
async function askOllama(prompt: string): Promise<string> {
  const res = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL ?? 'llama3.2:3b',
      messages: [
        {
          role: 'system',
          content:
            'Eres Yukiko, una bot kawaii y amigable de anime. Responde siempre en español, ' +
            'de forma breve y con personalidad divertida. Usa emojis con moderación.',
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

// ── Pollinations ──────────────────────────────────────────────
function imageUrl(prompt: string): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent('anime style, ' + prompt)}?width=1024&height=1024&nologo=true`;
}

// ── Command handler ───────────────────────────────────────────
async function handleCommand(command: string, args: string[]): Promise<{ text?: string; imageUrl?: string }> {
  const text = args.join(' ');

  switch (command) {
    case 'ask':
    case 'ia':
    case 'ai':
    case 'pregunta': {
      if (!text) return { text: '❌ Uso: /ask <pregunta>' };
      const reply = await askOllama(text);
      return { text: `🤖 ${reply}` };
    }
    case 'imagine':
    case 'generar':
    case 'draw': {
      if (!text) return { text: '❌ Uso: /imagine <descripción>' };
      return { text: `🎨 "${text}"`, imageUrl: imageUrl(text) };
    }
    case 'translate':
    case 'traducir':
    case 'tr': {
      const [lang, ...words] = args;
      if (!lang || !words.length) return { text: '❌ Uso: /translate <idioma> <texto>' };
      const reply = await askOllama(`Traduce al ${lang}: "${words.join(' ')}". Responde SOLO con la traducción.`);
      return { text: `🌐 **${lang}:** ${reply}` };
    }
    case 'help':
    case 'ayuda': {
      return {
        text:
          '🌨️ **Yukiko — Chat Web**\n\n' +
          '🤖 **IA**\n' +
          '`/ask <pregunta>` — Pregúntale algo a Yukiko\n' +
          '`/imagine <descripción>` — Genera una imagen con IA\n' +
          '`/translate <idioma> <texto>` — Traduce texto\n\n' +
          '💡 Para economía, roleplay y más, usa Discord o Telegram.',
      };
    }
    default:
      return { text: `❓ Comando desconocido: \`/${command}\`\nEscribe \`/help\` para ver los disponibles.` };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Health check público
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  const auth = req.headers['authorization']?.replace('Bearer ', '');
  if (auth !== SECRET) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  // POST /restart/:platform
  const restartMatch = req.url?.match(/^\/restart\/(discord|telegram)$/) && req.method === 'POST';
  if (restartMatch) {
    const platform = req.url!.split('/')[2];
    try {
      execSync(`pm2 restart yukiko-${platform}`, { cwd: CWD });
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, restarted: `yukiko-${platform}` }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // GET /status
  if (req.url === '/status' && req.method === 'GET') {
    try {
      const raw = execSync('pm2 jlist', { cwd: CWD }).toString();
      const list = JSON.parse(raw) as Array<{ name: string; pm2_env: { status: string } }>;
      const platforms = ['discord', 'telegram'];
      const result: Record<string, boolean> = {};
      for (const p of platforms) {
        const proc = list.find(x => x.name === `yukiko-${p}`);
        result[p] = proc?.pm2_env?.status === 'online';
      }
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // POST /backup
  if (req.url === '/backup' && req.method === 'POST') {
    try {
      execSync('bash scripts/db-backup.sh', { cwd: CWD });
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  // POST /chat
  if (req.url === '/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { command, args } = JSON.parse(body) as { command: string; args: string[] };
        const result = await handleCommand(command, args ?? []);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌨️ Yukiko agent escuchando en http://100.66.214.108:${PORT}`);
});
