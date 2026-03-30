// =============================================================
// Página Principal - Redirige al dashboard o login según rol
// =============================================================

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirigir según el rol del usuario
  const role = (session.user as any).role;

  if (role === 'ADMIN' || role === 'JEFE_COMUNIDAD') {
    redirect('/dashboard');
  } else {
    redirect('/mi-calle');
  }
}
