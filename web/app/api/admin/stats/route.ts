import { NextResponse } from 'next/server';
import { db, users, groups, commandLogs } from '@db/index.ts';
import { gte, count } from 'drizzle-orm';

export async function GET() {
  try {
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalGroups] = await db.select({ count: count() }).from(groups);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [commandsToday] = await db
      .select({ count: count() })
      .from(commandLogs)
      .where(gte(commandLogs.executedAt, today));

    // Consultar estado real de bots al agente del homelab
    let platforms = { discord: false, telegram: false, whatsapp: false };
    const agentUrl = process.env.HOMELAB_AGENT_URL;
    if (agentUrl) {
      try {
        const r = await fetch(`${agentUrl}/status`, {
          headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}` },
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) platforms = await r.json();
      } catch { /* agente no disponible, mantiene false */ }
    }

    return NextResponse.json({
      totalUsers: totalUsers.count,
      totalGroups: totalGroups.count,
      commandsToday: commandsToday.count,
      platforms,
    });
  } catch (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
