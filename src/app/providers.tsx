// =============================================================
// Proveedor de Sesión (NextAuth)
// Wrapper del cliente para SessionProvider
// =============================================================

'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { swrFetcher } from '@/lib/swr-fetcher';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher: swrFetcher,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
