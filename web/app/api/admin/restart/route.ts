import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = req.nextUrl.searchParams.get('platform');
  if (!platform || !['discord', 'telegram', 'whatsapp'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const agentUrl = process.env.HOMELAB_AGENT_URL;
  if (!agentUrl) {
    return NextResponse.json({ error: 'HOMELAB_AGENT_URL not configured' }, { status: 500 });
  }

  const res = await fetch(`${agentUrl}/restart/${platform}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json({ error: 'Agent unreachable' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, restarted: platform });
}
