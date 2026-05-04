import { NextRequest, NextResponse } from 'next/server';

const HOMELAB_AGENT_URL = process.env.HOMELAB_AGENT_URL ?? 'http://localhost:3001';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const r = await fetch(`${HOMELAB_AGENT_URL}/status`, {
      headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}` },
      signal: AbortSignal.timeout(3000),
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ discord: false, telegram: false, mobile: false });
  }
}
