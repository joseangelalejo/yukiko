import { NextResponse } from 'next/server';
import { db } from '@db/index.ts';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Count users from database
    const userCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM "user"`
    );
    const totalUsers = Number(
      (userCountResult as any)[0]?.cnt ?? 0
    );

    // Count groups from database
    const groupCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM "group"`
    );
    const totalGroups = Number(
      (groupCountResult as any)[0]?.cnt ?? 0
    );

    // Count commands executed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const commandCountResult = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM "commandLog" WHERE "executedAt" >= ${today}`
    );
    const commandsToday = Number(
      (commandCountResult as any)[0]?.cnt ?? 0
    );

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
      totalUsers,
      totalGroups,
      commandsToday,
      platforms,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: String(error) },
      { status: 500 }
    );
  }
}
