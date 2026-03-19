import { NextRequest, NextResponse } from 'next/server';

const AGENT_URL = process.env.HOMELAB_AGENT_URL ?? 'http://100.66.214.108:3001';
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json() as { message: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }

    // Parsear comando o texto libre
    let command = 'ask';
    let args: string[] = [message];

    if (message.startsWith('/')) {
      const parts = message.slice(1).trim().split(/\s+/);
      command = parts[0].toLowerCase();
      args = parts.slice(1);
    }

    const res = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ command, args }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      return NextResponse.json({ error: err.error ?? 'Error del agente' }, { status: 502 });
    }

    const data = await res.json() as { text?: string; imageUrl?: string };
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('abort') || msg.includes('timeout')) {
      return NextResponse.json({ error: 'Timeout — el homelab tardó demasiado' }, { status: 504 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
