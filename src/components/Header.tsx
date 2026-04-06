// =============================================================
// Componente Header
// Barra superior con nombre dinámico, rol y usuario
// =============================================================

'use client';

import { useSession, signOut } from 'next-auth/react';
import { FiMenu, FiLogOut, FiUser, FiChevronDown } from 'react-icons/fi';
import { useState } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle: () => void;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_COMUNIDAD: 'Jefe de Comunidad',
  JEFE_CALLE: 'Jefe de Calle',
};

const roleColors: Record<string, string> = {
  ADMIN: 'from-red-500 to-red-700',
  JEFE_COMUNIDAD: 'from-purple-500 to-purple-700',
  JEFE_CALLE: 'from-blue-500 to-blue-700',
};

export default function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const role = session?.user?.role ?? 'JEFE_CALLE';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Izquierda: Menú hamburguesa + Título */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Abrir menú"
          >
            <FiMenu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg md:text-xl font-bold text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Derecha: Info del usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[role]} flex items-center justify-center`}>
              <FiUser className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-200">{session?.user?.name}</p>
              <p className="text-xs text-slate-500">{roleLabels[role]}</p>
            </div>
            <FiChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
          </button>

          {/* Dropdown del usuario */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 glass-card p-2 z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-700 mb-1 sm:hidden">
                  <p className="text-sm font-medium text-slate-200">{session?.user?.name}</p>
                  <p className="text-xs text-slate-500">{roleLabels[role]}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <FiLogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
