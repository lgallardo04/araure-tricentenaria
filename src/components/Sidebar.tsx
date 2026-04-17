// =============================================================
// Componente Sidebar
// Navegación lateral con menús según rol (3 niveles)
// Incluye enlace a Demografía para Admin y Jefe de Comunidad
// =============================================================

'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { useState } from 'react';
import {
  FiHome, FiUsers, FiMap, FiMapPin, FiBarChart2,
  FiChevronDown, FiChevronRight, FiX, FiShield, FiClipboard, FiSettings, FiActivity, FiCheckSquare
} from 'react-icons/fi';

interface Comunidad {
  id: string;
  nombre: string;
  calles: { id: string; nombre: string }[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComunidad: (nombre: string) => void;
}

export default function Sidebar({ isOpen, onClose, onSelectComunidad }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');

  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN';

  // Obtener alertas de reportes para Admin
  const { data: countData } = useSWR<{count: number}>(isAdmin ? '/api/familias/aprobacion/count' : null);
  const pendingCount = countData?.count || 0;

  const isJefeComunidad = role === 'JEFE_COMUNIDAD';
  const isJefeCalle = role === 'JEFE_CALLE';

  const toggleExpand = (id: string, nombre: string) => {
    setExpandedId(expandedId === id ? null : id);
    onSelectComunidad(nombre);
  };

  const isActive = (path: string) => pathname === path;

  const homeLink = isAdmin ? '/dashboard' : isJefeComunidad ? '/dashboard' : '/mi-calle';

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-slate-900 border-r border-slate-800 
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:relative lg:translate-x-0 lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <Link href={homeLink} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <FiShield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Araure</h2>
                <p className="text-xs text-blue-400">Tricentenaria</p>
              </div>
            </Link>
            <button onClick={onClose} className="lg:hidden p-1 text-slate-500 hover:text-white">
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Badge del rol */}
          <div className="mt-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium
              ${isAdmin ? 'bg-red-500/20 text-red-400' :
                isJefeComunidad ? 'bg-purple-500/20 text-purple-400' :
                'bg-blue-500/20 text-blue-400'}`}>
              {isAdmin ? '🛡️ Administrador' :
                isJefeComunidad ? '🏘️ Jefe de Comunidad' :
                '📋 Jefe de Calle'}
            </span>
          </div>
        </div>

        {/* Navegación */}
        <nav className="p-3 space-y-1">
          {/* --- Sección Admin --- */}
          {isAdmin && (
            <>
              <p className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Panel Admin
              </p>

              <Link href="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={onClose}>
                <FiHome className="w-5 h-5" /><span>Dashboard</span>
              </Link>

              <Link href="/dashboard/jefes-calle" className={`sidebar-link ${isActive('/dashboard/jefes-calle') ? 'active' : ''}`} onClick={onClose}>
                <FiSettings className="w-5 h-5" /><span>Gestión de Usuarios</span>
              </Link>

              <Link href="/dashboard/comunidades" className={`sidebar-link ${isActive('/dashboard/comunidades') ? 'active' : ''}`} onClick={onClose}>
                <FiMap className="w-5 h-5" /><span>Comunidades</span>
              </Link>

              <Link href="/dashboard/calles" className={`sidebar-link ${isActive('/dashboard/calles') ? 'active' : ''}`} onClick={onClose}>
                <FiMapPin className="w-5 h-5" /><span>Calles</span>
              </Link>

              <Link href="/dashboard/familias" className={`sidebar-link ${isActive('/dashboard/familias') ? 'active' : ''}`} onClick={onClose}>
                <FiClipboard className="w-5 h-5" /><span>Familias Censadas</span>
              </Link>

              <Link href="/dashboard/demografia" className={`sidebar-link ${isActive('/dashboard/demografia') ? 'active' : ''}`} onClick={onClose}>
                <FiUsers className="w-5 h-5" /><span>Demografía</span>
              </Link>

              <Link href="/dashboard/salud" className={`sidebar-link ${isActive('/dashboard/salud') || pathname?.startsWith('/dashboard/salud') ? 'active' : ''}`} onClick={onClose}>
                <FiActivity className="w-5 h-5" /><span>Salud</span>
              </Link>
              
              <Link href="/dashboard/aprobaciones" className={`sidebar-link ${isActive('/dashboard/aprobaciones') ? 'active' : ''}`} onClick={onClose}>
                <FiCheckSquare className="w-5 h-5 text-emerald-400" />
                <span className="flex-1">Aprobaciones</span>
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>

              <Link href="/dashboard/reportes" className={`sidebar-link ${isActive('/dashboard/reportes') ? 'active' : ''}`} onClick={onClose}>
                <FiBarChart2 className="w-5 h-5" /><span>Reportes</span>
              </Link>
            </>
          )}

          {/* --- Sección Jefe de Comunidad --- */}
          {isJefeComunidad && (
            <>
              <p className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Mi Comunidad
              </p>

              <Link href="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={onClose}>
                <FiHome className="w-5 h-5" /><span>Dashboard</span>
              </Link>

              <Link href="/dashboard/comunidades" className={`sidebar-link ${isActive('/dashboard/comunidades') ? 'active' : ''}`} onClick={onClose}>
                <FiMap className="w-5 h-5" /><span>Mi Comunidad</span>
              </Link>

              <Link href="/dashboard/calles" className={`sidebar-link ${isActive('/dashboard/calles') ? 'active' : ''}`} onClick={onClose}>
                <FiMapPin className="w-5 h-5" /><span>Calles</span>
              </Link>

              <Link href="/dashboard/familias" className={`sidebar-link ${isActive('/dashboard/familias') ? 'active' : ''}`} onClick={onClose}>
                <FiClipboard className="w-5 h-5" /><span>Familias Censadas</span>
              </Link>

              <Link href="/dashboard/demografia" className={`sidebar-link ${isActive('/dashboard/demografia') ? 'active' : ''}`} onClick={onClose}>
                <FiUsers className="w-5 h-5" /><span>Demografía</span>
              </Link>

              <Link href="/dashboard/salud" className={`sidebar-link ${isActive('/dashboard/salud') || pathname?.startsWith('/dashboard/salud') ? 'active' : ''}`} onClick={onClose}>
                <FiActivity className="w-5 h-5" /><span>Salud</span>
              </Link>

              <Link href="/dashboard/reportes" className={`sidebar-link ${isActive('/dashboard/reportes') ? 'active' : ''}`} onClick={onClose}>
                <FiBarChart2 className="w-5 h-5" /><span>Reportes</span>
              </Link>
            </>
          )}

          {/* --- Sección Jefe de Calle --- */}
          {isJefeCalle && (
            <>
              <p className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Mi Panel
              </p>

              <Link href="/mi-calle" className={`sidebar-link ${isActive('/mi-calle') ? 'active' : ''}`} onClick={onClose}>
                <FiHome className="w-5 h-5" /><span>Mi Dashboard</span>
              </Link>

              <Link href="/mi-calle/censar" className={`sidebar-link ${isActive('/mi-calle/censar') ? 'active' : ''}`} onClick={onClose}>
                <FiClipboard className="w-5 h-5" /><span>Censar Familia</span>
              </Link>

              <Link href="/mi-calle/familias" className={`sidebar-link ${isActive('/mi-calle/familias') ? 'active' : ''}`} onClick={onClose}>
                <FiUsers className="w-5 h-5" /><span>Mis Familias</span>
              </Link>
            </>
          )}

          {/* --- Comunidades (navegación jerárquica) --- */}
          <div className="pt-4">
            <p className="px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isJefeComunidad ? 'Mi Comunidad' : 'Comunidades'}
            </p>

            {comunidades.map((com) => (
              <div key={com.id} className="animate-slide-in">
                <button
                  onClick={() => toggleExpand(com.id, com.nombre)}
                  className="w-full sidebar-link justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FiMap className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-sm">{com.nombre.replace('Consejo Comunal ', '')}</span>
                  </div>
                  {expandedId === com.id ? (
                    <FiChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>

                {expandedId === com.id && (
                  <div className="ml-8 space-y-0.5 py-1">
                    {com.calles.map((calle) => (
                      <Link
                        key={calle.id}
                        href={isJefeCalle ? `/mi-calle?calleId=${calle.id}` : `/dashboard/calles/${calle.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/50 transition-colors"
                        onClick={onClose}
                      >
                        <FiMapPin className="w-3 h-3" />
                        <span className="truncate">{calle.nombre}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
