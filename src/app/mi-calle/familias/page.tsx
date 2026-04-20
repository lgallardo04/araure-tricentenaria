// =============================================================
// Lista de Familias del Jefe de Calle — Normalizado
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { FiSearch, FiX, FiUsers, FiUser, FiMapPin, FiChevronDown, FiChevronUp, FiTrash2, FiHome, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

interface Persona {
  id: string;
  esJefe: boolean;
  nombre: string;
  cedula: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  parentesco: string | null;
  telefono: string | null;
  pensionado: boolean;
  discapacidad: boolean;
  embarazada: boolean;
  lactancia: boolean;
}

interface Familia {
  id: string;
  vivienda: {
    direccion: string;
    tipo: string | null;
    tenencia: string | null;
    materialConstruccion: string | null;
    servicios: { tipo: string; estado: string }[];
  } | null;
  programaSocial: {
    carnetPatria: boolean;
    recibeClap: boolean;
  } | null;
  calle: { id: string; nombre: string; comunidad: { nombre: string } };
  personas: Persona[];
}

export default function MisFamiliasPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const listKey = session && sessionStatus === 'authenticated'
    ? debouncedSearch ? `/api/familias?search=${encodeURIComponent(debouncedSearch)}` : '/api/familias'
    : null;

  const { data: familias = [], error, isLoading: loading, mutate } = useSWR<Familia[]>(listKey);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la familia de "${nombre}"?`)) return;
    try {
      const res = await apiFetch(`/api/familias?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j as { error?: string }).error || 'Error al eliminar');
        return;
      }
      toast.success('Familia eliminada');
      mutate();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const getJefe = (fam: Familia) => fam.personas.find((p) => p.esJefe);
  const getMiembros = (fam: Familia) => fam.personas.filter((p) => !p.esJefe);
  const getServicio = (fam: Familia, tipo: string) =>
    fam.vivienda?.servicios.find((s) => s.tipo === tipo)?.estado || '—';

  if (sessionStatus === 'loading') {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <p className="text-red-400 text-sm">
          Error al cargar.{' '}
          <button type="button" className="underline" onClick={() => mutate()}>Reintentar</button>
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Mis Familias Censadas</h2>
          <p className="text-slate-500 mt-1">{familias.length} familias registradas en tus calles</p>
        </div>
        <a
          href={debouncedSearch ? `/api/export/familias?search=${encodeURIComponent(debouncedSearch)}` : '/api/export/familias'}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium transition-colors"
        >
          <FiDownload className="w-4 h-4" />
          Exportar CSV
        </a>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, cédula o dirección..." className="input-field pl-12" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : familias.length === 0 ? (
        <div className="text-center py-16 px-4 text-slate-400 glass-card mx-auto mt-8">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
            <FiUsers className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No tienes familias registradas</h3>
          <p className="max-w-md mx-auto mb-6">Aún no has registrado ninguna familia en las calles que administras. Dirígete a la sección &quot;Censar&quot; para comenzar a añadir los datos de tus vecinos.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {familias.map((fam) => {
            const jefe = getJefe(fam);
            const miembros = getMiembros(fam);
            return (
              <div key={fam.id} className="glass-card overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === fam.id ? null : fam.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <FiUser className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{jefe?.nombre ?? '—'}</h3>
                      <p className="text-xs text-slate-500">CI: {jefe?.cedula ?? ''} · {fam.calle.nombre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge-blue">{fam.personas.length}</span>
                    {fam.programaSocial?.carnetPatria && <span className="badge-purple text-xs">CP</span>}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(fam.id, jefe?.nombre ?? ''); }}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                    {expandedId === fam.id ? <FiChevronUp className="w-4 h-4 text-slate-500" /> : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {expandedId === fam.id && (
                  <div className="border-t border-slate-700/50 p-4 bg-slate-900/30 animate-fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                      <div><span className="text-slate-500 text-xs">Dirección</span><p className="text-slate-300">{fam.vivienda?.direccion ?? '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">Teléfono</span><p className="text-slate-300">{jefe?.telefono ?? '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">Vivienda</span><p className="text-slate-300">{fam.vivienda?.tipo ?? '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">Tenencia</span><p className="text-slate-300">{fam.vivienda?.tenencia ?? '—'}</p></div>
                      <div><span className="text-slate-500 text-xs">Agua</span><p className="text-slate-300">{getServicio(fam, 'AGUA')}</p></div>
                      <div><span className="text-slate-500 text-xs">Electricidad</span><p className="text-slate-300">{getServicio(fam, 'ELECTRICIDAD')}</p></div>
                    </div>
                    <div className="flex gap-2 mb-4">
                      {fam.programaSocial?.carnetPatria && <span className="badge-purple">Carnet de la Patria</span>}
                      {fam.programaSocial?.recibeClap && <span className="badge-green">Recibe CLAP</span>}
                    </div>
                    {miembros.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-400 mb-2">Miembros ({miembros.length})</h4>
                        <div className="space-y-2">
                          {miembros.map((m) => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <FiUser className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="text-slate-300 truncate">{m.nombre}</span>
                                {m.parentesco && <span className="text-slate-600 text-xs">({m.parentesco})</span>}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {m.pensionado && <span className="badge-yellow text-xs">Pen.</span>}
                                {m.discapacidad && <span className="badge-red text-xs">Disc.</span>}
                                {m.embarazada && <span className="text-xs bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full">Emb.</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
