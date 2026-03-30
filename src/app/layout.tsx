// =============================================================
// Layout Principal de la Aplicación
// =============================================================

import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Comuna Araure Tricentenaria - Sistema de Censo',
  description: 'Sistema web de censo comunal para la Comuna Araure Tricentenaria. Gestión de comunidades, calles, familias y población.',
  keywords: 'censo, comuna, araure, tricentenaria, comunidad, venezuela',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950">
        <Providers>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
