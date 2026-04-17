// =============================================================
// Familias Censadas (Vista Admin / Jefe de Comunidad)
// Lista de todas las familias con búsqueda, datos expandidos
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiSearch, FiX, FiUsers, FiMapPin, FiTrash2, FiChevronDown, FiChevronUp, FiUser, FiHome, FiDownload, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

interface Miembro {
  id: string;
  nombre: string;
  cedula: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  parentesco: string | null;
  escolaridad: string | null;
  pensionado: boolean;
  discapacidad: boolean;
  embarazada: boolean;
  lactancia: boolean;
}

interface Familia {
  id: string;
  direccion: string;
  tipoVivienda: string | null;
  tenencia: string | null;
  materialConstruccion: string | null;
  servicioAgua: string | null;
  servicioElectricidad: string | null;
  servicioGas: string | null;
  servicioInternet: string | null;
  carnetPatria: boolean;
  recibeClap: boolean;
  ingresoFamiliar: string | null;
  jfNombre: string;
  jfCedula: string;
  jfTelefono: string | null;
  jfOcupacion: string | null;
  jfEscolaridad: string | null;
  jfNacionalidad: string;
  calle: { id: string; nombre: string; comunidad: { id: string; nombre: string } };
  miembros: Miembro[];
  createdAt: string;
}

export default function FamiliasPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCalleId = searchParams.get('calleId');

  const canExport = ['ADMIN', 'JEFE_COMUNIDAD'].includes(session?.user?.role ?? '');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Construir URL de API con filtros
  const getListKey = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (urlCalleId) params.set('calleId', urlCalleId);
    
    const query = params.toString();
    return query ? `/api/familias?${query}` : '/api/familias';
  };

  const {
    data: familias = [],
    error,
    isLoading: loading,
    mutate,
  } = useSWR<Familia[]>(getListKey());

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

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Familias Censadas</h2>
          <p className="text-slate-500 mt-1">{familias.length} familias registradas en el censo</p>
        </div>
        {canExport && (
          <a
            href={
              debouncedSearch
                ? `/api/export/familias?search=${encodeURIComponent(debouncedSearch)}`
                : '/api/export/familias'
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Exportar CSV
          </a>
        )}
      </div>

      {/* Búsqueda con debounce y filtros activos */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full max-w-md">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o dirección..."
            className="input-field pl-12"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {urlCalleId && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-2 rounded-xl text-blue-400 text-sm animate-fade-in">
            <FiFilter className="w-4 h-4" />
            <span>Filtrado por calle</span>
            <button 
              onClick={() => router.push('/dashboard/familias')}
              className="ml-1 hover:text-white transition-colors"
              title="Quitar filtro"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">Error al cargar. <button type="button" className="underline" onClick={() => mutate()}>Reintentar</button></p>
      )}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : familias.length === 0 ? (
        <div className="text-center py-16 px-4 text-slate-400 glass-card mx-auto mt-8">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
            <FiUsers className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No se encontraron familias</h3>
          <p className="max-w-md mx-auto mb-6">Aún no hay censos registrados en la plataforma o los filtros no coinciden. Avisele a los Jefes de Calle que comiencen a registrar datos desde el menú &quot;Censar&quot;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {familias.map((fam) => (
            <div key={fam.id} className="glass-card overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                onClick={() => setExpandedId(expandedId === fam.id ? null : fam.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{fam.jfNombre}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>CI: {fam.jfNacionalidad}-{fam.jfCedula}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-3 h-3" />
                        {fam.calle.nombre} — {fam.calle.comunidad.nombre.replace('Consejo Comunal ', '')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge-blue">{fam.miembros.length + 1}</span>
                  {fam.carnetPatria && <span className="badge-purple text-xs hidden sm:inline-flex">CP</span>}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(fam.id, fam.jfNombre); }}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  {expandedId === fam.id ? <FiChevronUp className="w-4 h-4 text-slate-500" /> : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {expandedId === fam.id && (
                <div className="border-t border-slate-700/50 p-4 space-y-4 bg-slate-900/30 animate-fade-in">
                  {/* Datos de vivienda */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-slate-500 text-xs">Dirección</span><p className="text-slate-300">{fam.direccion}</p></div>
                    <div><span className="text-slate-500 text-xs">Vivienda</span><p className="text-slate-300">{fam.tipoVivienda || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Tenencia</span><p className="text-slate-300">{fam.tenencia || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Teléfono</span><p className="text-slate-300">{fam.jfTelefono || '—'}</p></div>
                  </div>

                  {/* Servicios */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-slate-500 text-xs">Agua</span><p className="text-slate-300">{fam.servicioAgua || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Electricidad</span><p className="text-slate-300">{fam.servicioElectricidad || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Gas</span><p className="text-slate-300">{fam.servicioGas || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Internet</span><p className="text-slate-300">{fam.servicioInternet || '—'}</p></div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {fam.carnetPatria && <span className="badge-purple">Carnet de la Patria</span>}
                    {fam.recibeClap && <span className="badge-green">Recibe CLAP</span>}
                    {fam.ingresoFamiliar && <span className="badge-yellow">{fam.ingresoFamiliar}</span>}
                  </div>

                  {/* Miembros */}
                  {fam.miembros.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Miembros del Hogar ({fam.miembros.length})</h4>
                      <div className="space-y-2">
                        {fam.miembros.map((m) => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <FiUser className="w-3 h-3 text-slate-500 flex-shrink-0" />
                              <span className="text-slate-300 truncate">{m.nombre}</span>
                              {m.parentesco && <span className="text-slate-600 text-xs">({m.parentesco})</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {m.genero === 'M' ? <span className="text-xs text-blue-400">M</span> : m.genero === 'F' ? <span className="text-xs text-pink-400">F</span> : null}
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
          ))}
        </div>
      )}
    </div>
  );
}
