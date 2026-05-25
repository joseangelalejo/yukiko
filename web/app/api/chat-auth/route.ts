import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'yukiko_chat';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json() as { username: string; password: string };

    const usersRaw = process.env.CHAT_USERS ?? '';
    // Formato: "usuario1:hash1,usuario2:hash2"
    const users = Object.fromEntries(
      usersRaw.split(',').filter(Boolean).map(entry => {
        const [u, h] = entry.split(':');
        return [u?.trim(), h?.trim()];
      })
    );

    const expectedHash = users[username?.trim()];
    if (!expectedHash) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const inputHash = await sha256(password);
    if (inputHash !== expectedHash) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    // Token de sesión = hash(username + password + secret)
    const sessionToken = await sha256(`${username}:${password}:${process.env.ADMIN_SECRET}`);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
