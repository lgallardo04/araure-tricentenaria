'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiClock, FiSettings } from 'react-icons/fi';

interface FamiliaPendiente {
  id: string;
  jfNombre: string;
  jfCedula: string;
  direccion: string;
  estado: string;
  createdAt: string;
  calle: {
    nombre: string;
    jefeCalle: { name: string } | null;
    comunidad: { nombre: string };
  };
  _count: { miembros: number };
}

export default function AprobacionesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [filterEstado, setFilterEstado] = useState('PENDIENTE');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: familias, error, isLoading, mutate } = useSWR<FamiliaPendiente[]>(
    isAdmin ? `/api/familias/aprobacion?estado=${filterEstado}` : null
  );

  const handleAprobacion = async (familiaId: string, nuevoEstado: 'APROBADA' | 'RECHAZADA') => {
    if (!confirm(`¿Estás seguro de marcar este censo como ${nuevoEstado}?`)) return;
    
    setProcessingId(familiaId);
    try {
      const res = await fetch('/api/familias/aprobacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familiaId, nuevoEstado }),
      });

      if (!res.ok) throw new Error('Falló la actualización');
      
      toast.success(`Censo MARCADO como ${nuevoEstado}`);
      mutate();
    } catch (err) {
      toast.error('Error al actualizar estado del censo');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-fade-in">
        <FiSettings className="w-12 h-12 text-slate-500 animate-spin" />
        <p className="text-red-400 font-medium">Acceso Denegado. Requiere privilegios de Administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiCheck className="text-emerald-400" /> Aprobaciones de Censos
          </h2>
          <p className="text-slate-500 mt-1">Revisa y valida las planillas censales enviadas por los Jefes de Calle.</p>
        </div>

        <select 
          value={filterEstado} 
          onChange={e => setFilterEstado(e.target.value)}
          className="select-field max-w-[200px]"
        >
          <option value="PENDIENTE">⏳ Pendientes</option>
          <option value="APROBADA">✅ Aprobadas</option>
          <option value="RECHAZADA">❌ Rechazadas</option>
        </select>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        {isLoading && (
          <div className="flex justify-center p-10"><div className="w-8 h-8 animate-spin border-4 border-emerald-500/30 border-t-emerald-500 rounded-full" /></div>
        )}
        {error && (
          <div className="p-10 text-center text-red-400">Hubo un error cargando los datos.</div>
        )}
        
        {!isLoading && !error && familias?.length === 0 && (
          <div className="text-center py-16 px-4 text-slate-400 mx-auto">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${filterEstado === 'PENDIENTE' ? 'bg-blue-900/20 border-blue-500/30 text-blue-500' : filterEstado === 'APROBADA' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500' : 'bg-red-900/20 border-red-500/30 text-red-500'}`}>
              <FiCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filterEstado === 'PENDIENTE' ? '¡Estás al día!' : `No hay censos en estado ${filterEstado.toLowerCase()}`}
            </h3>
            <p className="max-w-md mx-auto mb-6">
              {filterEstado === 'PENDIENTE' 
                ? 'No hay planillas esperando tu revisión. Todo el trabajo administrativo ha sido despachado.' 
                : `Aún no se ha movido ninguna familia a esta categoría.`}
            </p>
          </div>
        )}

        {!isLoading && familias && familias.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400">Jefe de Familia</th>
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400">Dirección / Geografía</th>
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400">Enviado Por</th>
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400">Miembros</th>
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400">Fecha</th>
                  <th className="p-4 text-xs font-semibold uppercase text-slate-400 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {familias.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium text-slate-200">{f.jfNombre}</p>
                      <p className="text-xs text-slate-500">CI: {f.jfCedula}</p>
                    </td>
                    <td className="p-4 max-w-[200px] truncate">
                      <p className="text-sm text-slate-300 truncate">{f.direccion}</p>
                      <p className="text-xs text-blue-400 truncate">{f.calle.comunidad.nombre} - {f.calle.nombre}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">
                        {f.calle.jefeCalle?.name || 'Veedor'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {f._count.miembros + 1}
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {f.estado === 'PENDIENTE' ? (
                        <>
                          <button 
                            disabled={processingId === f.id}
                            onClick={() => handleAprobacion(f.id, 'APROBADA')}
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            {processingId === f.id ? '...' : 'Aprobar'}
                          </button>
                          <button 
                            disabled={processingId === f.id}
                            onClick={() => handleAprobacion(f.id, 'RECHAZADA')}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                          >
                            {processingId === f.id ? '...' : 'Rechazar'}
                          </button>
                        </>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${f.estado === 'APROBADA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {f.estado}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
