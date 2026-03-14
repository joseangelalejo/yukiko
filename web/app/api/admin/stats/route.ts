import { NextResponse } from 'next/server';
import { db, users, groups, commandLogs } from '@db/index.ts';
import { sql, gte } from 'drizzle-orm';

export async function GET() {
  try {
    const [usersResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [groupsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(groups);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [commandsResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(commandLogs)
      .where(gte(commandLogs.executedAt, today));

    let platforms = { discord: false, telegram: false, whatsapp: false };
    const agentUrl = process.env.HOMELAB_AGENT_URL;
    if (agentUrl) {
      try {
        const r = await fetch(`${agentUrl}/status`, {
          headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}` },
          signal: AbortSignal.timeout(3000),
        });
        if (r.ok) platforms = await r.json();
      } catch { /* agente no disponible */ }
    }

    return NextResponse.json({
      totalUsers: usersResult.count,
      totalGroups: groupsResult.count,
      commandsToday: commandsResult.count,
      platforms,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
