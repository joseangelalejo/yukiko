import { NextResponse } from 'next/server';

function getDBHealth() {
  // Placeholder - actual health checked by bots
  return 0;
}

export async function GET() {
  try {
    const dbHealth = getDBHealth();

    return NextResponse.json({
      timestamp: Date.now(),
      db: {
        status: dbHealth < 100 ? 'healthy' : 'slow',
        latency: dbHealth,
      },
      app: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Monitoring error' }, { status: 500 });
  }
}
