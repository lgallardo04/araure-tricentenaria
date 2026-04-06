// =============================================================
// Middleware - Protección de Rutas + rate limit en login
// =============================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { rateLimitAuthRequest } from '@/lib/rate-limit-auth';

const authMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (token?.role === 'ADMIN') {
      return NextResponse.next();
    }

    if (token?.role === 'JEFE_COMUNIDAD') {
      const adminOnlyRoutes = ['/dashboard/jefes-calle'];
      if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.next();
      }
      if (pathname.startsWith('/mi-calle')) {
        return NextResponse.next();
      }
      return NextResponse.next();
    }

    if (token?.role === 'JEFE_CALLE') {
      const adminRoutes = ['/dashboard'];
      if (adminRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/mi-calle', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith('/api/auth')) {
    const { allowed } = await rateLimitAuthRequest(req);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de inicio de sesión. Intente más tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': '900' },
        }
      );
    }
    return NextResponse.next();
  }
  return authMiddleware(req as never, event);
}

export const config = {
  matcher: ['/dashboard/:path*', '/mi-calle/:path*', '/api/auth/:path*'],
};
