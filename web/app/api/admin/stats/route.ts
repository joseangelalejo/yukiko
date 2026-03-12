import { NextResponse } from 'next/server';
import { db, users, groups, commandLogs } from '../../../../db/index.ts';
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

    return NextResponse.json({
      totalUsers: totalUsers.count,
      totalGroups: totalGroups.count,
      commandsToday: commandsToday.count,
      platforms: {
        discord: true,   // TODO: ping actual bot process
        telegram: true,
        whatsapp: true,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
