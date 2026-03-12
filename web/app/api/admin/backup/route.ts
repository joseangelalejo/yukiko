import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agentUrl = process.env.HOMELAB_AGENT_URL;
  if (!agentUrl) {
    return NextResponse.json({ error: 'HOMELAB_AGENT_URL not configured' }, { status: 500 });
  }

  const res = await fetch(`${agentUrl}/backup`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json({ error: 'Agent unreachable' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
