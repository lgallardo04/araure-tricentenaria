// =============================================================
// Middleware - Protección de Rutas
// Controla acceso según roles: ADMIN, JEFE_COMUNIDAD, JEFE_CALLE
// =============================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Si es admin, tiene acceso a todo
    if (token?.role === 'ADMIN') {
      return NextResponse.next();
    }

    // Jefes de Comunidad: acceso al dashboard (excepto gestión de usuarios)
    if (token?.role === 'JEFE_COMUNIDAD') {
      // Rutas restringidas solo para Admin
      const adminOnlyRoutes = ['/dashboard/jefes-calle'];
      if (adminOnlyRoutes.some((route) => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      // Permitir acceso al dashboard y sus subrutas
      if (pathname.startsWith('/dashboard')) {
        return NextResponse.next();
      }
      // Permitir acceso a mi-calle también
      if (pathname.startsWith('/mi-calle')) {
        return NextResponse.next();
      }
      return NextResponse.next();
    }

    // Jefes de Calle: solo acceso a /mi-calle
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

// Proteger todas las rutas excepto login, api/auth y archivos estáticos
export const config = {
  matcher: ['/dashboard/:path*', '/mi-calle/:path*'],
};
