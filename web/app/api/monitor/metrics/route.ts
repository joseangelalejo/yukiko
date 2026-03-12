import { NextResponse } from 'next/server';
import os from 'os';

function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  return Math.round((1 - totalIdle / totalTick) * 100);
}

async function pingLatency(url: string): Promise<number> {
  const start = Date.now();
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return Date.now() - start;
  } catch {
    return 9999;
  }
}

export async function GET() {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);

  const [discordLatency, telegramLatency] = await Promise.all([
    pingLatency('https://discord.com/api/v10/gateway'),
    pingLatency('https://api.telegram.org'),
  ]);

  // Fake DB latency - replace with actual Neon ping
  const dbLatency = 45;

  return NextResponse.json({
    uptime: Math.floor(process.uptime()),
    cpu: getCpuUsage(),
    memory: {
      used: totalMem - freeMem,
      total: totalMem,
    },
    commandsPerHour: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50)), // replace with real DB query
    latency: {
      discord: discordLatency,
      telegram: telegramLatency,
      whatsapp: 120, // WhatsApp doesn't have a public ping endpoint
      db: dbLatency,
    },
    errors: 0, // replace with real count from logs
  });
}
