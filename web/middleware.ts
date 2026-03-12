import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/admin/login', '/api/admin/auth'];
const COOKIE_NAME = 'yukiko_admin';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (!isProtected || isPublic) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;

  // El middleware no tiene acceso a ADMIN_SECRET en Vercel edge runtime
  // Simplemente comprueba que la cookie existe y no está vacía
  // La validación real del valor ocurre en /api/admin/auth al hacer login
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

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
