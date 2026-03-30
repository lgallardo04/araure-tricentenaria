// =============================================================
// Mi Calle - Dashboard del Jefe de Calle
// Muestra calles asignadas con estadísticas resumidas
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FiMapPin, FiUsers, FiClipboard, FiPlus, FiBarChart2, FiHome } from 'react-icons/fi';

interface CalleResumen {
  id: string;
  nombre: string;
  avenida: string | null;
  comunidad: { nombre: string };
  _count: { familias: number };
}

export default function MiCallePage() {
  const { data: session } = useSession();
  const [calles, setCalles] = useState<CalleResumen[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const userId = (session.user as any).id;

    Promise.all([
      fetch(`/api/calles?jefeCalleId=${userId}`).then((r) => r.json()),
      fetch('/api/estadisticas').then((r) => r.json()),
    ])
      .then(([callesData, statsData]) => {
        setCalles(callesData);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Mi Panel</h2>
        <p className="text-slate-500 mt-1">Bienvenido, {session?.user?.name}</p>
      </div>

      {/* Resumen rápido */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <FiMapPin className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{calles.length}</p>
            <p className="text-xs text-slate-500">Calles Asignadas</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <FiHome className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalFamilias}</p>
            <p className="text-xs text-slate-500">Familias</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <FiUsers className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalMiembros}</p>
            <p className="text-xs text-slate-500">Personas</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
                <FiBarChart2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalPensionados}</p>
            <p className="text-xs text-slate-500">Pensionados</p>
          </div>
        </div>
      )}

      {/* Acción rápida */}
      <Link href="/mi-calle/censar"
        className="glass-card p-5 flex items-center gap-4 hover:bg-slate-800/30 transition-colors group">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <FiPlus className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Censar Nueva Familia</h3>
          <p className="text-sm text-slate-500">Registrar una nueva familia en el censo</p>
        </div>
      </Link>

      {/* Calles asignadas */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Mis Calles Asignadas</h3>
        {calles.length === 0 ? (
          <div className="glass-card text-center py-10 text-slate-500">
            <FiMapPin className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No tiene calles asignadas</p>
            <p className="text-sm mt-1">Contacte al administrador para que le asigne calles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {calles.map((calle) => (
              <Link key={calle.id} href={`/mi-calle/familias`}
                className="glass-card p-4 hover:bg-slate-800/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <FiMapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{calle.nombre}</h4>
                    <p className="text-xs text-slate-500 truncate">
                      {calle.comunidad.nombre.replace('Consejo Comunal ', '')}
                      {calle.avenida && ` · ${calle.avenida}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="badge-blue">{calle._count.familias} familias</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
