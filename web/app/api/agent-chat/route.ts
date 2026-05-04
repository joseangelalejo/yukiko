import { NextRequest, NextResponse } from 'next/server';

const HOMELAB_AGENT_URL = process.env.HOMELAB_AGENT_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${HOMELAB_AGENT_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_SECRET ?? ''}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
