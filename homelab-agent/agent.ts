import http from 'http';
import { execSync } from 'child_process';
import { config } from 'dotenv';

config({ path: '/home/dockerja/docker-compose-files/yukiko/.env' });

const SECRET = process.env.ADMIN_SECRET;
const PORT = 3001;
const CWD = '/home/dockerja/docker-compose-files/yukiko';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Health check público — no requiere auth
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

  res.setHeader('Content-Type', 'application/json');

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

  // POST /backup — dispara el script de backup
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

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌨️ Yukiko agent escuchando en http://100.66.214.108:${PORT}`);
});
