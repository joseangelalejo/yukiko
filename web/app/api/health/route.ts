import { NextResponse } from 'next/server';
export async function GET() {
  try {
    const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
