import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ADMIN_PASSWORD, PUBLIC_ADMIN_USERNAME } from '@/lib/admin-credentials';

export async function POST(req: NextRequest) {
  const { username = PUBLIC_ADMIN_USERNAME, password } = await req.json() as { username?: string; password: string };
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const isPublicCredential = username === PUBLIC_ADMIN_USERNAME && password === PUBLIC_ADMIN_PASSWORD;
  const isPrivateCredential = Boolean(adminSecret) && username === PUBLIC_ADMIN_USERNAME && password === adminSecret;

  if (!password || (!isPublicCredential && !isPrivateCredential)) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('yukiko_admin', isPublicCredential ? PUBLIC_ADMIN_PASSWORD : adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('yukiko_admin');
  return res;
}
