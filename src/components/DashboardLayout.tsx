// =============================================================
// Layout del Dashboard 
// Layout compartido con Sidebar + Header para todas las páginas internas
// =============================================================

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('Comuna Araure Tricentenaria');
  const router = useRouter();

  // Mientras carga la sesión
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  // No autenticado
  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectComunidad={(nombre) => setHeaderTitle(nombre)}
      />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen lg:min-w-0">
        <Header
          title={headerTitle}
          subtitle="Sistema de Censo Comunal"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
