// =============================================================
// Proveedor de Sesión (NextAuth)
// Wrapper del cliente para SessionProvider
// =============================================================

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
