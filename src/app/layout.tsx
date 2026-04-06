// =============================================================
// Layout Principal de la Aplicación
// =============================================================

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: {
    default: 'Comuna Araure Tricentenaria - Sistema de Censo',
    template: '%s · Araure Tricentenaria',
  },
  description:
    'Sistema web de censo comunal para la Comuna Araure Tricentenaria. Gestión de comunidades, calles, familias y población.',
  keywords: ['censo', 'comuna', 'araure', 'tricentenaria', 'consejo comunal', 'venezuela'],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
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
