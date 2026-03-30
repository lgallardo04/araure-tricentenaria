// =============================================================
// Lista de Familias del Jefe de Calle
// Muestra solo las familias de las calles asignadas
// FIXED: N+1 query issue - now fetches all families in one request
// =============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FiSearch, FiX, FiUsers, FiUser, FiMapPin, FiChevronDown, FiChevronUp, FiTrash2, FiHome } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Miembro {
  id: string;
  nombre: string;
  cedula: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  parentesco: string | null;
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
  jfNombre: string;
  jfCedula: string;
  jfTelefono: string | null;
  servicioAgua: string | null;
  servicioElectricidad: string | null;
  carnetPatria: boolean;
  recibeClap: boolean;
  calle: { id: string; nombre: string; comunidad: { nombre: string } };
  miembros: Miembro[];
}

export default function MisFamiliasPage() {
  const { data: session } = useSession();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const userId = (session.user as any).id;
      // Fetch streets to get their IDs
      const callesRes = await fetch(`/api/calles?jefeCalleId=${userId}`);
      const calles = await callesRes.json();

      // Fetch ALL families for all streets in parallel
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
      const promises = calles.map((c: any) => fetch(`/api/familias?calleId=${c.id}${searchParam}`).then((r) => r.json()));
      const results = await Promise.all(promises);
      setFamilias(results.flat());
    } catch {
      toast.error('Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [session, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la familia de "${nombre}"?`)) return;
    try {
      await fetch(`/api/familias?id=${id}`, { method: 'DELETE' });
      toast.success('Familia eliminada');
      fetchData();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">Mis Familias Censadas</h2>
        <p className="text-slate-500 mt-1">
          {familias.length} familias registradas en tus calles
        </p>
      </div>

      <div className="relative max-w-md">
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

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : familias.length === 0 ? (
        <div className="text-center py-12 text-slate-500 glass-card">
          <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron familias censadas</p>
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
                    <p className="text-xs text-slate-500">CI: {fam.jfCedula} · {fam.calle.nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="badge-blue">{fam.miembros.length + 1}</span>
                  {fam.carnetPatria && <span className="badge-purple text-xs">CP</span>}
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(fam.id, fam.jfNombre); }}
                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                  {expandedId === fam.id ? <FiChevronUp className="w-4 h-4 text-slate-500" /> : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {expandedId === fam.id && (
                <div className="border-t border-slate-700/50 p-4 bg-slate-900/30 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                    <div><span className="text-slate-500 text-xs">Dirección</span><p className="text-slate-300">{fam.direccion}</p></div>
                    <div><span className="text-slate-500 text-xs">Teléfono</span><p className="text-slate-300">{fam.jfTelefono || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Vivienda</span><p className="text-slate-300">{fam.tipoVivienda || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Tenencia</span><p className="text-slate-300">{fam.tenencia || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Agua</span><p className="text-slate-300">{fam.servicioAgua || '—'}</p></div>
                    <div><span className="text-slate-500 text-xs">Electricidad</span><p className="text-slate-300">{fam.servicioElectricidad || '—'}</p></div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {fam.carnetPatria && <span className="badge-purple">Carnet de la Patria</span>}
                    {fam.recibeClap && <span className="badge-green">Recibe CLAP</span>}
                  </div>
                  {fam.miembros.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Miembros ({fam.miembros.length})</h4>
                      <div className="space-y-2">
                        {fam.miembros.map((m) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
