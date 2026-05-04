import { NextResponse } from 'next/server';

const HOMELAB_AGENT_URL = process.env.HOMELAB_AGENT_URL ?? 'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${HOMELAB_AGENT_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
