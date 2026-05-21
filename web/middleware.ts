import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'yukiko_admin';
const CHAT_COOKIE = 'yukiko_chat';

const ADMIN_PUBLIC = ['/admin/login', '/api/admin/auth'];
const CHAT_PUBLIC = ['/chat/login', '/api/chat-auth'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Proteger /admin ──────────────────────────────────────────
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isAdminPublic = ADMIN_PUBLIC.some(p => pathname.startsWith(p));

  if (isAdminPath && !isAdminPublic) {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!cookie) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Proteger /chat ───────────────────────────────────────────
  const isChatPath = pathname.startsWith('/chat') || pathname === '/api/chat';
  const isChatPublic = CHAT_PUBLIC.some(p => pathname.startsWith(p));

  if (isChatPath && !isChatPublic) {
    const cookie = req.cookies.get(CHAT_COOKIE)?.value;
    if (!cookie) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/chat/login';
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/chat/:path*', '/api/chat'],
};
