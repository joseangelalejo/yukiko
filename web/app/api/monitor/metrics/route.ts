import { NextResponse } from 'next/server';
import os from 'os';
import { db, commandLogs } from '@db/index.ts';
import { gte, eq, count, sql } from 'drizzle-orm';

async function pingLatency(url: string): Promise<number> {
  const start = Date.now();
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    return Date.now() - start;
  } catch {
    return 9999;
  }
}

async function getDbLatency(): Promise<number> {
  const start = Date.now();
  try {
    await db.select({ one: sql`1` }).from(commandLogs).limit(1);
    return Date.now() - start;
  } catch {
    return 9999;
  }
}

export async function GET() {
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [discordLatency, telegramLatency, dbLatency] = await Promise.all([
    pingLatency('https://discord.com/api/v10/gateway'),
    pingLatency('https://api.telegram.org'),
    getDbLatency(),
  ]);

  // Comandos por hora (últimas 24h)
  const commandsRaw = await db
    .select({
      hour: sql<number>`EXTRACT(HOUR FROM ${commandLogs.executedAt})`,
      total: count(),
    })
    .from(commandLogs)
    .where(gte(commandLogs.executedAt, today))
    .groupBy(sql`EXTRACT(HOUR FROM ${commandLogs.executedAt})`);

  const commandsPerHour = Array.from({ length: 24 }, (_, h) => {
    const row = commandsRaw.find(r => Number(r.hour) === h);
    return row ? Number(row.total) : 0;
  });

  // Errores del día
  const [errorsRow] = await db
    .select({ count: count() })
    .from(commandLogs)
    .where(gte(commandLogs.executedAt, today))
    .where(eq(commandLogs.success, false));

  return NextResponse.json({
    uptime: Math.floor(process.uptime()),
    cpu: 0, // N/A en Vercel serverless — el homelab tiene su propio health-check
    memory: {
      used: totalMem - freeMem,
      total: totalMem,
    },
    commandsPerHour,
    latency: {
      discord: discordLatency,
      telegram: telegramLatency,
      whatsapp: 0, // WhatsApp no tiene endpoint público de ping
      db: dbLatency,
    },
    errors: Number(errorsRow?.count ?? 0),
  });
}
