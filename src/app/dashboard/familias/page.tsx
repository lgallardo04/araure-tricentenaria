// =============================================================
// Familias Censadas (Vista Admin / Jefe de Comunidad) — Normalizado
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FiSearch, FiX, FiUsers, FiMapPin, FiTrash2, FiSlash, FiCheckCircle,
  FiChevronDown, FiChevronUp, FiUser, FiHome, FiDownload, FiFilter, FiEdit2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

// ─── Interfaces ───────────────────────────────────────────────
interface Persona {
  id: string;
  esJefe: boolean;
  nombre: string;
  cedula: string | null;
  nacionalidad: string;
  fechaNacimiento: string | null;
  genero: string | null;
  parentesco: string | null;
  telefono: string | null;
  escolaridad: string | null;
  ocupacion: string | null;
  pensionado: boolean;
  discapacidad: boolean;
  embarazada: boolean;
  lactancia: boolean;
  esVotante: boolean;
  votaEnEscuela: boolean;
  centroVotacion: string | null;
  activo: boolean;
  motivoInactivo: string | null;
}

interface Familia {
  id: string;
  vivienda: {
    id: string;
    direccion: string;
    tipo: string | null;
    tenencia: string | null;
    materialConstruccion: string | null;
    servicios: { tipo: string; estado: string }[];
    activo: boolean;
  } | null;
  programaSocial: {
    carnetPatria: boolean;
    recibeClap: boolean;
    ingresoFamiliar: string | null;
  } | null;
  calle: { id: string; nombre: string; comunidad: { id: string; nombre: string } };
  personas: Persona[];
  createdAt: string;
}

// ─── Motivos de inhabilitación ────────────────────────────────
const MOTIVOS = ['Vendió', 'Falleció', 'Se mudó', 'Trasladado', 'Deportado', 'Otro'];

// ─── Modal: Inhabilitar Persona ───────────────────────────────
interface InhabilitarPersonaModalProps {
  nombre: string;
  motivo: string;
  motivoOtro: string;
  saving: boolean;
  onMotivoChange: (m: string) => void;
  onMotivoOtroChange: (m: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function InhabilitarPersonaModal({
  nombre, motivo, motivoOtro, saving,
  onMotivoChange, onMotivoOtroChange, onClose, onSubmit,
}: InhabilitarPersonaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Inhabilitar Persona</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          ¿Por qué razón se va a inhabilitar a <span className="text-white font-semibold">{nombre}</span>?
          <br />
          <span className="text-amber-400 text-xs mt-1 inline-block">⚠️ El registro histórico permanecerá en la base de datos.</span>
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMotivoChange(m)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  motivo === m
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          {motivo === 'Otro' && (
            <input
              type="text"
              value={motivoOtro}
              onChange={(e) => onMotivoOtroChange(e.target.value)}
              placeholder="Especifique el motivo..."
              className="input-field animate-fade-in"
              required
            />
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSlash className="w-4 h-4" />}
              Inhabilitar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────
export default function FamiliasPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCalleId = searchParams.get('calleId');

  const isAdmin = session?.user?.role === 'ADMIN';
  const canExport = ['ADMIN', 'JEFE_COMUNIDAD'].includes(session?.user?.role ?? '');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Persona modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedPersonaNombre, setSelectedPersonaNombre] = useState('');
  const [motivo, setMotivo] = useState('Vendió');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [savingPersona, setSavingPersona] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getListKey = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (urlCalleId) params.set('calleId', urlCalleId);
    const query = params.toString();
    return query ? `/api/familias?${query}` : '/api/familias';
  };

  const { data: familias = [], error, isLoading: loading, mutate } = useSWR<Familia[]>(getListKey());

  // ─── Helpers ─────────────────────────────────────────────────
  const getJefe = (fam: Familia) => fam.personas.find((p) => p.esJefe);
  const getMiembros = (fam: Familia) => fam.personas.filter((p) => !p.esJefe);
  const getServicio = (fam: Familia, tipo: string) =>
    fam.vivienda?.servicios.find((s) => s.tipo === tipo)?.estado || '—';

  // ─── Familia handlers ─────────────────────────────────────────
  const handleFamiliaDelete = async (id: string, nombre: string) => {
    if (!confirm(`🚨 ¿ELIMINAR FAMILIA PERMANENTEMENTE?\n\nEsto borrará la familia de "${nombre}" de forma definitiva e irreversible.`)) return;
    try {
      const res = await apiFetch(`/api/familias?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j as { error?: string }).error || 'Error al eliminar');
        return;
      }
      toast.success('Familia eliminada permanentemente');
      mutate();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ─── Vivienda handlers ────────────────────────────────────────
  const handleViviendaToggle = async (id: string, currentActivo: boolean) => {
    const action = currentActivo ? 'inhabilitar' : 'reactivar';
    if (!confirm(`¿Está seguro de que desea ${action} esta vivienda?`)) return;
    try {
      const res = await apiFetch('/api/viviendas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: !currentActivo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `Error al ${action} vivienda`);
      }
      toast.success(`Vivienda ${currentActivo ? 'inhabilitada' : 'reactivada'} exitosamente`);
      mutate();
    } catch (err: any) {
      toast.error(err.message || `Error al ${action} vivienda`);
    }
  };

  const handleViviendaDelete = async (id: string) => {
    if (!confirm('🚨 ¿ELIMINAR VIVIENDA PERMANENTEMENTE?\n\nEsta acción borrará el registro de la base de datos de forma definitiva e irreversible.')) return;
    try {
      const res = await apiFetch(`/api/viviendas?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Error al eliminar vivienda');
      }
      toast.success('Vivienda eliminada definitivamente');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar vivienda');
    }
  };

  // ─── Persona handlers ─────────────────────────────────────────
  const openInhabilitarModal = (id: string, nombre: string) => {
    setSelectedPersonaId(id);
    setSelectedPersonaNombre(nombre);
    setMotivo('Vendió');
    setMotivoOtro('');
    setShowModal(true);
  };

  const handlePersonaInhabilitarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonaId) return;
    const finalMotivo = motivo === 'Otro' ? motivoOtro.trim() : motivo;
    if (!finalMotivo) { toast.error('Especifique el motivo'); return; }
    setSavingPersona(true);
    try {
      const res = await apiFetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPersonaId, activo: false, motivoInactivo: finalMotivo }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Error al inhabilitar');
      }
      toast.success('Integrante inhabilitado exitosamente');
      setShowModal(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al inhabilitar');
    } finally {
      setSavingPersona(false);
    }
  };

  const handlePersonaReactivar = async (id: string) => {
    if (!confirm('¿Desea reactivar a este integrante de la vivienda?')) return;
    try {
      const res = await apiFetch('/api/personas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, activo: true }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Error al reactivar');
      }
      toast.success('Integrante reactivado exitosamente');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al reactivar');
    }
  };

  const handlePersonaDelete = async (id: string) => {
    if (!confirm('🚨 ¿ELIMINAR PERSONA PERMANENTEMENTE?\n\nEsta acción borrará el registro de la base de datos de forma definitiva e irreversible.')) return;
    try {
      const res = await apiFetch(`/api/personas?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Error al eliminar');
      }
      toast.success('Registro eliminado definitivamente');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Modal */}
      {showModal && (
        <InhabilitarPersonaModal
          nombre={selectedPersonaNombre}
          motivo={motivo}
          motivoOtro={motivoOtro}
          saving={savingPersona}
          onMotivoChange={setMotivo}
          onMotivoOtroChange={setMotivoOtro}
          onClose={() => setShowModal(false)}
          onSubmit={handlePersonaInhabilitarSubmit}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Familias Censadas</h2>
          <p className="text-slate-500 mt-1">{familias.length} familias registradas en el censo</p>
        </div>
        {canExport && (
          <a
            href={debouncedSearch ? `/api/export/familias?search=${encodeURIComponent(debouncedSearch)}` : '/api/export/familias'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Exportar CSV
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="relative flex-1 w-full max-w-md">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o dirección..." className="input-field pl-12" />
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
            <button onClick={() => router.push('/dashboard/familias')} className="ml-1 hover:text-white transition-colors" title="Quitar filtro">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">Error al cargar. <button type="button" className="underline" onClick={() => mutate()}>Reintentar</button></p>
      )}

      {/* List */}
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
          <p className="max-w-md mx-auto mb-6">Aún no hay censos registrados o los filtros no coinciden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {familias.map((fam) => {
            const jefe = getJefe(fam);
            const miembros = getMiembros(fam);
            const viviendaActiva = fam.vivienda?.activo !== false;

            return (
              <div key={fam.id} className={`glass-card overflow-hidden ${!viviendaActiva ? 'opacity-70 border-amber-500/20' : ''}`}>
                {/* Card Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === fam.id ? null : fam.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${viviendaActiva ? 'bg-blue-500/20' : 'bg-amber-500/20'}`}>
                      <FiUser className={`w-5 h-5 ${viviendaActiva ? 'text-blue-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{jefe?.nombre ?? '—'}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>CI: {jefe?.nacionalidad ?? ''}-{jefe?.cedula ?? ''}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FiMapPin className="w-3 h-3" />
                          {fam.calle.nombre} — {fam.calle.comunidad.nombre.replace('Consejo Comunal ', '')}
                        </span>
                      </div>
                    </div>
                    {!viviendaActiva && (
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full flex-shrink-0">
                        ⚠️ Vivienda Inactiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="badge-blue">{fam.personas.length}</span>
                    {fam.programaSocial?.carnetPatria && <span className="badge-purple text-xs hidden sm:inline-flex">CP</span>}
                    <Link href={`/mi-calle/censar?edit=${fam.id}`} onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-400 transition-colors" title="Editar">
                      <FiEdit2 className="w-4 h-4" />
                    </Link>
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); handleFamiliaDelete(fam.id, jefe?.nombre ?? ''); }}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                        title="Eliminar familia permanentemente">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                    {expandedId === fam.id
                      ? <FiChevronUp className="w-4 h-4 text-slate-500" />
                      : <FiChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded content */}
                {expandedId === fam.id && (
                  <div className="border-t border-slate-700/50 p-4 space-y-4 bg-slate-900/30 animate-fade-in">

                    {/* ── Vivienda Section ─────────────────────── */}
                    <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FiHome className={`w-4 h-4 ${viviendaActiva ? 'text-slate-400' : 'text-amber-400'}`} />
                          <span className="text-sm font-semibold text-slate-300">Vivienda</span>
                          {!viviendaActiva && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-full">Inactiva</span>
                          )}
                        </div>
                        {fam.vivienda && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleViviendaToggle(fam.vivienda!.id, fam.vivienda!.activo)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                                viviendaActiva
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                              title={viviendaActiva ? 'Inhabilitar vivienda' : 'Reactivar vivienda'}
                            >
                              {viviendaActiva ? <><FiSlash className="w-3 h-3" /> Inhabilitar</> : <><FiCheckCircle className="w-3 h-3" /> Reactivar</>}
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleViviendaDelete(fam.vivienda!.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                                title="Eliminar vivienda permanentemente"
                              >
                                <FiTrash2 className="w-3 h-3" /> Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-slate-500 text-xs">Dirección</span><p className="text-slate-300">{fam.vivienda?.direccion ?? '—'}</p></div>
                        <div><span className="text-slate-500 text-xs">Tipo</span><p className="text-slate-300">{fam.vivienda?.tipo ?? '—'}</p></div>
                        <div><span className="text-slate-500 text-xs">Tenencia</span><p className="text-slate-300">{fam.vivienda?.tenencia ?? '—'}</p></div>
                        <div><span className="text-slate-500 text-xs">Teléfono</span><p className="text-slate-300">{jefe?.telefono ?? '—'}</p></div>
                        <div><span className="text-slate-500 text-xs">Agua</span><p className="text-slate-300">{getServicio(fam, 'AGUA')}</p></div>
                        <div><span className="text-slate-500 text-xs">Electricidad</span><p className="text-slate-300">{getServicio(fam, 'ELECTRICIDAD')}</p></div>
                        <div><span className="text-slate-500 text-xs">Gas</span><p className="text-slate-300">{getServicio(fam, 'GAS')}</p></div>
                        <div><span className="text-slate-500 text-xs">Internet</span><p className="text-slate-300">{getServicio(fam, 'INTERNET')}</p></div>
                      </div>
                    </div>

                    {/* ── Social Programs ──────────────────────── */}
                    <div className="flex flex-wrap gap-2">
                      {fam.programaSocial?.carnetPatria && <span className="badge-purple">Carnet de la Patria</span>}
                      {fam.programaSocial?.recibeClap && <span className="badge-green">Recibe CLAP</span>}
                      {fam.programaSocial?.ingresoFamiliar && <span className="badge-yellow">{fam.programaSocial.ingresoFamiliar}</span>}
                    </div>

                    {/* ── Jefe de familia ──────────────────────── */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                          <FiUser className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-blue-300">Jefe de Familia</h4>
                      </div>
                      {jefe && (
                        <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border ${
                          jefe.activo === false
                            ? 'bg-slate-800/30 border-red-500/20 opacity-60'
                            : 'bg-slate-800/50 border-slate-700/40'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <FiUser className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className={`font-medium ${jefe.activo === false ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                {jefe.nombre}
                              </span>
                              <span className="text-xs text-slate-600 ml-2">{jefe.nacionalidad}-{jefe.cedula}</span>
                              {jefe.activo === false && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-full">
                                  ❌ {jefe.motivoInactivo || 'Inactivo'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {jefe.genero === 'M' ? <span className="text-xs text-blue-400">M</span> : jefe.genero === 'F' ? <span className="text-xs text-pink-400">F</span> : null}
                            {jefe.pensionado && <span className="badge-yellow text-xs">Pen.</span>}
                            {jefe.discapacidad && <span className="badge-red text-xs">Disc.</span>}
                            {jefe.activo === false ? (
                              <>
                                <button onClick={() => handlePersonaReactivar(jefe.id)}
                                  className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors" title="Reactivar">
                                  <FiCheckCircle className="w-3.5 h-3.5" />
                                </button>
                                {isAdmin && (
                                  <button onClick={() => handlePersonaDelete(jefe.id)}
                                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Eliminar permanentemente">
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button onClick={() => openInhabilitarModal(jefe.id, jefe.nombre)}
                                className="p-1.5 hover:bg-amber-500/20 rounded-lg text-slate-500 hover:text-amber-400 transition-colors" title="Inhabilitar">
                                <FiSlash className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Carga Familiar ───────────────────────── */}
                    {miembros.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <FiUsers className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <h4 className="text-sm font-semibold text-indigo-300">
                            Carga Familiar de {jefe?.nombre} ({miembros.length})
                          </h4>
                        </div>
                        <div className="space-y-2 pl-2 border-l-2 border-indigo-500/20">
                          {miembros.map((m) => (
                            <div key={m.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm border ${
                              m.activo === false
                                ? 'bg-slate-800/30 border-red-500/20 opacity-60'
                                : 'bg-slate-800/50 border-slate-700/40'
                            }`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <FiUser className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className={`${m.activo === false ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                    {m.nombre}
                                  </span>
                                  {m.parentesco && <span className="text-slate-600 text-xs ml-1">({m.parentesco})</span>}
                                  {m.activo === false && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-full">
                                      ❌ {m.motivoInactivo || 'Inactivo'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {m.genero === 'M' ? <span className="text-xs text-blue-400">M</span> : m.genero === 'F' ? <span className="text-xs text-pink-400">F</span> : null}
                                {m.pensionado && <span className="badge-yellow text-xs">Pen.</span>}
                                {m.discapacidad && <span className="badge-red text-xs">Disc.</span>}
                                {m.embarazada && <span className="text-xs bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded-full">Emb.</span>}
                                {m.activo === false ? (
                                  <>
                                    <button onClick={() => handlePersonaReactivar(m.id)}
                                      className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-slate-500 hover:text-emerald-400 transition-colors" title="Reactivar">
                                      <FiCheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    {isAdmin && (
                                      <button onClick={() => handlePersonaDelete(m.id)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Eliminar permanentemente">
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button onClick={() => openInhabilitarModal(m.id, m.nombre)}
                                    className="p-1.5 hover:bg-amber-500/20 rounded-lg text-slate-500 hover:text-amber-400 transition-colors" title="Inhabilitar">
                                    <FiSlash className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
