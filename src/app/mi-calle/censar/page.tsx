// =============================================================
// Formulario de Censo Completo — Normalizado
// 4 pasos: Vivienda, Jefe de Familia, Miembros, Servicios
// Envía payload normalizado al API
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import {
  FiPlus, FiTrash2, FiSave, FiUser, FiHome, FiUsers,
  FiZap, FiCheckCircle, FiAlertCircle, FiChevronLeft, FiChevronRight,
  FiActivity, FiHeart, FiSlash
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

const CENSO_DRAFT_KEY = 'araure-censo-borrador-v2';

interface Calle {
  id: string;
  nombre: string;
  comunidad: { id: string; nombre: string };
}

interface MiembroForm {
  nombre: string;
  cedula: string;
  nacionalidad: string;
  fechaNacimiento: string;
  genero: string;
  parentesco: string;
  estadoCivil: string;
  escolaridad: string;
  ocupacion: string;
  lugarTrabajo: string;
  salud: string;
  pensionado: boolean;
  discapacidad: boolean;
  tipoDiscapacidad: string;
  embarazada: boolean;
  lactancia: boolean;
  esVotante: boolean;
  votaEnEscuela: boolean;
  centroVotacion: string;
  registrosSalud: any[];
}

const miembroVacio: MiembroForm = {
  nombre: '', cedula: '', nacionalidad: 'V', fechaNacimiento: '', genero: '',
  parentesco: '', estadoCivil: '', escolaridad: '', ocupacion: '', lugarTrabajo: '',
  salud: '', pensionado: false, discapacidad: false, tipoDiscapacidad: '',
  embarazada: false, lactancia: false, esVotante: false, votaEnEscuela: false,
  centroVotacion: '', registrosSalud: [],
};

function HealthRecordsSection({
  registros,
  onChange,
  catalogEnfermedades,
  catalogMedicamentos,
  onMutateEnfermedades,
  onMutateMedicamentos,
}: {
  registros: any[];
  onChange: (updated: any[]) => void;
  catalogEnfermedades: any[];
  catalogMedicamentos: any[];
  onMutateEnfermedades: () => void;
  onMutateMedicamentos: () => void;
}) {
  const [showEnfModal, setShowEnfModal] = useState(false);
  const [showMedModal, setShowMedModal] = useState(false);
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

  // New disease form state
  const [newEnf, setNewEnf] = useState({ nombre: '', tipo: 'Crónica', descripcion: '' });
  const [savingEnf, setSavingEnf] = useState(false);

  // New medicine form state
  const [newMed, setNewMed] = useState({ nombre: '', principioActivo: '', presentacion: '', unidad: '', descripcion: '' });
  const [savingMed, setSavingMed] = useState(false);

  const addRecord = () => {
    onChange([
      ...(registros || []),
      {
        enfermedadId: '',
        medicamentoId: '',
        dosis: '',
        frecuencia: '',
        cantidadMes: '',
        severidad: '',
        observaciones: '',
        activo: true,
      },
    ]);
  };

  const removeRecord = (index: number) => {
    onChange((registros || []).filter((_, i) => i !== index));
  };

  const updateRecord = (index: number, field: string, value: any) => {
    const updated = [...(registros || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleCreateEnfermedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnf.nombre.trim()) {
      toast.error('El nombre de la enfermedad es obligatorio');
      return;
    }
    setSavingEnf(true);
    try {
      const res = await apiFetch('/api/enfermedades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEnf),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar la enfermedad');
      }
      const data = await res.json();
      toast.success('Enfermedad agregada al catálogo');
      
      // Mutar catálogo
      onMutateEnfermedades();
      
      // Seleccionar automáticamente en la fila activa
      if (activeRowIdx !== null) {
        updateRecord(activeRowIdx, 'enfermedadId', data.id);
      }
      
      // Cerrar y limpiar
      setShowEnfModal(false);
      setNewEnf({ nombre: '', tipo: 'Crónica', descripcion: '' });
      setActiveRowIdx(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la enfermedad');
    } finally {
      setSavingEnf(false);
    }
  };

  const handleCreateMedicamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.nombre.trim() || !newMed.principioActivo.trim()) {
      toast.error('El nombre y el principio activo son obligatorios');
      return;
    }
    setSavingMed(true);
    try {
      const res = await apiFetch('/api/medicamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMed),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar el medicamento');
      }
      const data = await res.json();
      toast.success('Medicamento agregado al catálogo');
      
      // Mutar catálogo
      onMutateMedicamentos();
      
      // Seleccionar automáticamente en la fila activa
      if (activeRowIdx !== null) {
        updateRecord(activeRowIdx, 'medicamentoId', data.id);
      }
      
      // Cerrar y limpiar
      setShowMedModal(false);
      setNewMed({ nombre: '', principioActivo: '', presentacion: '', unidad: '', descripcion: '' });
      setActiveRowIdx(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el medicamento');
    } finally {
      setSavingMed(false);
    }
  };

  return (
    <div className="space-y-4 mt-4 border-t border-slate-700/50 pt-4 w-full">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
          <FiActivity className="text-emerald-400 w-4 h-4" />
          Registros de Salud / Tratamientos ({(registros || []).length})
        </h4>
        <button
          type="button"
          onClick={addRecord}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all"
        >
          <FiPlus className="w-3.5 h-3.5" /> Agregar Diagnóstico
        </button>
      </div>

      {(registros || []).length === 0 ? (
        <p className="text-xs text-slate-500 italic">No se han registrado diagnósticos de salud para esta persona.</p>
      ) : (
        <div className="space-y-3">
          {(registros || []).map((reg, idx) => (
            <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 relative space-y-3">
              <button
                type="button"
                onClick={() => removeRecord(idx)}
                className="absolute top-2 right-2 p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors"
                title="Eliminar diagnóstico"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Enfermedad *</label>
                  <div className="flex gap-1.5">
                    <select
                      value={reg.enfermedadId}
                      onChange={(e) => updateRecord(idx, 'enfermedadId', e.target.value)}
                      className="select-field text-xs py-1.5 flex-1"
                      required
                    >
                      <option value="">Seleccionar enfermedad...</option>
                      {catalogEnfermedades.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} ({e.tipo})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRowIdx(idx);
                        setShowEnfModal(true);
                      }}
                      className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-all flex-shrink-0"
                      title="Nueva enfermedad"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Medicamento (opcional)</label>
                  <div className="flex gap-1.5">
                    <select
                      value={reg.medicamentoId || ''}
                      onChange={(e) => updateRecord(idx, 'medicamentoId', e.target.value || null)}
                      className="select-field text-xs py-1.5 flex-1"
                    >
                      <option value="">Ninguno / No requiere</option>
                      {catalogMedicamentos.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} — {m.principioActivo} {m.presentacion ? `(${m.presentacion})` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRowIdx(idx);
                        setShowMedModal(true);
                      }}
                      className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-all flex-shrink-0"
                      title="Nuevo medicamento"
                    >
                      <FiPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Dosis, frecuencia, cantidad, severidad */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Dosis</label>
                  <input
                    type="text"
                    value={reg.dosis || ''}
                    onChange={(e) => updateRecord(idx, 'dosis', e.target.value)}
                    className="input-field text-xs py-1.5"
                    placeholder="Ej: 1 comp"
                    disabled={!reg.medicamentoId}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Frecuencia</label>
                  <select
                    value={reg.frecuencia || ''}
                    onChange={(e) => updateRecord(idx, 'frecuencia', e.target.value)}
                    className="select-field text-xs py-1.5"
                    disabled={!reg.medicamentoId}
                  >
                    <option value="">Seleccionar...</option>
                    <option>Diaria</option>
                    <option>Semanal</option>
                    <option>Mensual</option>
                    <option>Según necesidad</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Cant./Mes</label>
                  <input
                    type="number"
                    step="1"
                    value={reg.cantidadMes || ''}
                    onChange={(e) => updateRecord(idx, 'cantidadMes', e.target.value)}
                    className="input-field text-xs py-1.5"
                    placeholder="Ej: 30"
                    disabled={!reg.medicamentoId}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Severidad</label>
                  <select
                    value={reg.severidad || ''}
                    onChange={(e) => updateRecord(idx, 'severidad', e.target.value)}
                    className="select-field text-xs py-1.5"
                  >
                    <option value="">Seleccionar...</option>
                    <option>Leve</option>
                    <option>Moderada</option>
                    <option>Severa</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={reg.observaciones || ''}
                    onChange={(e) => updateRecord(idx, 'observaciones', e.target.value)}
                    className="input-field text-xs py-1.5"
                    placeholder="Observaciones de salud o dosis..."
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reg.activo !== false}
                      onChange={(e) => updateRecord(idx, 'activo', e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-400">Activo</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nueva Enfermedad */}
      {showEnfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiActivity className="text-blue-400 w-5 h-5" /> Registrar Nueva Enfermedad
            </h3>
            <form onSubmit={handleCreateEnfermedad} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre de la Enfermedad *</label>
                <input
                  type="text"
                  value={newEnf.nombre}
                  onChange={(e) => setNewEnf({ ...newEnf, nombre: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Ej: Hipertensión Arterial"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Tipo *</label>
                <select
                  value={newEnf.tipo}
                  onChange={(e) => setNewEnf({ ...newEnf, tipo: e.target.value })}
                  className="select-field text-sm"
                >
                  <option value="Crónica">Crónica</option>
                  <option value="Aguda">Aguda</option>
                  <option value="Infecciosa">Infecciosa</option>
                  <option value="Degenerativa">Degenerativa</option>
                  <option value="Mental">Mental</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Descripción (Opcional)</label>
                <textarea
                  value={newEnf.descripcion}
                  onChange={(e) => setNewEnf({ ...newEnf, descripcion: e.target.value })}
                  className="input-field text-sm"
                  rows={2}
                  placeholder="Detalles sobre síntomas o clasificación..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnfModal(false);
                    setNewEnf({ nombre: '', tipo: 'Crónica', descripcion: '' });
                    setActiveRowIdx(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEnf}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {savingEnf ? 'Guardando...' : 'Crear Enfermedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Medicamento */}
      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiActivity className="text-emerald-400 w-5 h-5" /> Registrar Nuevo Medicamento
            </h3>
            <form onSubmit={handleCreateMedicamento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Nombre Comercial / Común *</label>
                <input
                  type="text"
                  value={newMed.nombre}
                  onChange={(e) => setNewMed({ ...newMed, nombre: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Ej: Losartán Potásico"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Principio Activo *</label>
                <input
                  type="text"
                  value={newMed.principioActivo}
                  onChange={(e) => setNewMed({ ...newMed, principioActivo: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Ej: Losartán"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Presentación (Opcional)</label>
                  <input
                    type="text"
                    value={newMed.presentacion}
                    onChange={(e) => setNewMed({ ...newMed, presentacion: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Ej: Tabletas, Suspensión..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Unidad (Opcional)</label>
                  <input
                    type="text"
                    value={newMed.unidad}
                    onChange={(e) => setNewMed({ ...newMed, unidad: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Ej: 50mg, 100ml..."
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Descripción / Indicaciones (Opcional)</label>
                <textarea
                  value={newMed.descripcion}
                  onChange={(e) => setNewMed({ ...newMed, descripcion: e.target.value })}
                  className="input-field text-sm"
                  rows={2}
                  placeholder="Uso, laboratorio u otros detalles..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMedModal(false);
                    setNewMed({ nombre: '', principioActivo: '', presentacion: '', unidad: '', descripcion: '' });
                    setActiveRowIdx(null);
                  }}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMed}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
                >
                  {savingMed ? 'Guardando...' : 'Crear Medicamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CensarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [calles, setCalles] = useState<Calle[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const editId = searchParams.get('edit');
  const [calleId, setCalleId] = useState(searchParams.get('calleId') || '');

  // Catálogos cargados de la base de datos
  const { data: catalogEnfermedades = [], mutate: mutateEnfermedades } = useSWR<any[]>('/api/enfermedades');
  const { data: catalogMedicamentos = [], mutate: mutateMedicamentos } = useSWR<any[]>('/api/medicamentos');

  const [vivienda, setVivienda] = useState({
    direccion: '', tipo: '', tenencia: '', materialConstruccion: '',
    cantidadHabitaciones: '', cantidadBanos: '', observaciones: '',
  });

  const [servicios, setServicios] = useState({
    AGUA: '', ELECTRICIDAD: '', GAS: '',
    INTERNET: '', ASEO: '', TELEFONO: '',
  });

  const [programas, setProgramas] = useState({
    carnetPatria: false, codigoCarnetPatria: '', recibeClap: false,
    otrosBeneficios: '', ingresoFamiliar: '',
  });

  const [jefe, setJefe] = useState({
    nombre: '', cedula: '', nacionalidad: 'V', fechaNacimiento: '', genero: '',
    estadoCivil: '', telefono: '', email: '', escolaridad: '',
    ocupacion: '', lugarTrabajo: '', pensionado: false,
    discapacidad: false, tipoDiscapacidad: '', enfermedad: '',
    embarazada: false, lactancia: false,
    esVotante: false, votaEnEscuela: false, centroVotacion: '',
    registrosSalud: [] as any[],
  });

  const [miembros, setMiembros] = useState<MiembroForm[]>([]);
  const [draftChecked, setDraftChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (errors[field]) {
      const next = { ...errors };
      delete next[field];
      setErrors(next);
    }
  };

  useEffect(() => {
    if (!session || draftChecked) return;
    if (editId) {
      // En modo edición, no restaurar borradores — se cargan datos del servidor
      setDraftChecked(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(CENSO_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (window.confirm('Hay un borrador de censo sin enviar. ¿Desea continuar donde lo dejó?')) {
          if (typeof d.step === 'number') setStep(d.step);
          if (d.calleId !== undefined) setCalleId(d.calleId);
          if (d.vivienda) setVivienda((prev) => ({ ...prev, ...d.vivienda }));
          if (d.servicios) setServicios((prev) => ({ ...prev, ...d.servicios }));
          if (d.programas) setProgramas((prev) => ({ ...prev, ...d.programas }));
          if (d.jefe) setJefe((prev) => ({ ...prev, ...d.jefe }));
          if (d.miembros?.length) setMiembros(d.miembros);
        } else {
          sessionStorage.removeItem(CENSO_DRAFT_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(CENSO_DRAFT_KEY);
    }
    setDraftChecked(true);
  }, [session, draftChecked, editId]);

  useEffect(() => {
    if (!session || !draftChecked) return;
    const userId = session.user.id;
    const role = session.user.role;

    const url = role === 'JEFE_CALLE'
      ? `/api/calles?jefeCalleId=${userId}`
      : '/api/calles';

    apiFetch(url)
      .then((r) => r.json())
      .then((data: Calle[]) => {
        setCalles(data);
        if (data.length === 1 && !calleId) setCalleId(data[0].id);
      })
      .catch(console.error);
  }, [session, draftChecked, calleId]);

  useEffect(() => {
    if (!editId || !session || !draftChecked) return;
    
    apiFetch(`/api/familias?id=${editId}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setCalleId(data.calleId || '');
          if (data.vivienda) {
            setVivienda({
              direccion: data.vivienda.direccion || '',
              tipo: data.vivienda.tipo || '',
              tenencia: data.vivienda.tenencia || '',
              materialConstruccion: data.vivienda.materialConstruccion || '',
              cantidadHabitaciones: data.vivienda.cantidadHabitaciones?.toString() || '',
              cantidadBanos: data.vivienda.cantidadBanos?.toString() || '',
              observaciones: data.vivienda.observaciones || '',
            });
            
            const newServicios = { AGUA: '', ELECTRICIDAD: '', GAS: '', INTERNET: '', ASEO: '', TELEFONO: '' };
            if (data.vivienda.servicios) {
              data.vivienda.servicios.forEach((s: any) => {
                if (s.tipo in newServicios) (newServicios as any)[s.tipo] = s.estado;
              });
            }
            setServicios(newServicios);
          }
          
          if (data.programaSocial) {
            setProgramas({
              carnetPatria: data.programaSocial.carnetPatria || false,
              codigoCarnetPatria: data.programaSocial.codigoCarnetPatria || '',
              recibeClap: data.programaSocial.recibeClap || false,
              otrosBeneficios: data.programaSocial.otrosBeneficios || '',
              ingresoFamiliar: data.programaSocial.ingresoFamiliar || '',
            });
          }
          
          if (data.personas) {
            const j = data.personas.find((p: any) => p.esJefe);
            if (j) {
              setJefe({
                nombre: j.nombre || '',
                cedula: j.cedula || '',
                nacionalidad: j.nacionalidad || 'V',
                fechaNacimiento: j.fechaNacimiento ? new Date(j.fechaNacimiento).toISOString().split('T')[0] : '',
                genero: j.genero || '',
                estadoCivil: j.estadoCivil || '',
                telefono: j.telefono || '',
                email: j.email || '',
                escolaridad: j.escolaridad || '',
                ocupacion: j.ocupacion || '',
                lugarTrabajo: j.lugarTrabajo || '',
                pensionado: j.pensionado || false,
                discapacidad: j.discapacidad || false,
                tipoDiscapacidad: j.tipoDiscapacidad || '',
                enfermedad: j.enfermedad || '',
                embarazada: j.embarazada || false,
                lactancia: j.lactancia || false,
                esVotante: j.esVotante || false,
                votaEnEscuela: j.votaEnEscuela || false,
                centroVotacion: j.centroVotacion || '',
                registrosSalud: j.registrosSalud || [],
              });
            }
            
            const mList = data.personas.filter((p: any) => !p.esJefe).map((m: any) => ({
              nombre: m.nombre || '',
              cedula: m.cedula || '',
              nacionalidad: m.nacionalidad || 'V',
              fechaNacimiento: m.fechaNacimiento ? new Date(m.fechaNacimiento).toISOString().split('T')[0] : '',
              genero: m.genero || '',
              parentesco: m.parentesco || '',
              estadoCivil: m.estadoCivil || '',
              escolaridad: m.escolaridad || '',
              ocupacion: m.ocupacion || '',
              lugarTrabajo: m.lugarTrabajo || '',
              salud: m.enfermedad || '',
              pensionado: m.pensionado || false,
              discapacidad: m.discapacidad || false,
              tipoDiscapacidad: m.tipoDiscapacidad || '',
              embarazada: m.embarazada || false,
              lactancia: m.lactancia || false,
              esVotante: m.esVotante || false,
              votaEnEscuela: m.votaEnEscuela || false,
              centroVotacion: m.centroVotacion || '',
              registrosSalud: m.registrosSalud || [],
            }));
            setMiembros(mList);
          }
        }
      })
      .catch(console.error);
  }, [editId, session, draftChecked]);

  useEffect(() => {
    if (!session || !draftChecked) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(
          CENSO_DRAFT_KEY,
          JSON.stringify({ step, calleId, vivienda, servicios, programas, jefe, miembros })
        );
      } catch { /* almacenamiento lleno */ }
    }, 500);
    return () => clearTimeout(t);
  }, [session, draftChecked, step, calleId, vivienda, servicios, programas, jefe, miembros]);

  const addMiembro = () => setMiembros([...miembros, { ...miembroVacio }]);
  const removeMiembro = (i: number) => setMiembros(miembros.filter((_, idx) => idx !== i));
  const updateMiembro = (i: number, field: string, value: any) => {
    const updated = [...miembros];
    (updated[i] as any)[field] = value;
    setMiembros(updated);
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!calleId) { toast.error('Seleccione una calle'); return false; }
      if (!vivienda.direccion) { toast.error('La dirección es obligatoria'); return false; }
      if (!vivienda.tipo) { toast.error('El tipo de vivienda es obligatorio'); return false; }
      if (!vivienda.tenencia) { toast.error('La tenencia es obligatoria'); return false; }
    }
    if (s === 2) {
      if (!jefe.nombre) { toast.error('El nombre del jefe es obligatorio'); return false; }
      if (!jefe.cedula) { toast.error('La cédula del jefe es obligatoria'); return false; }
      if (!jefe.fechaNacimiento) { toast.error('La fecha de nacimiento es obligatoria'); return false; }
      if (!jefe.genero) { toast.error('El género del jefe es obligatorio'); return false; }
      if (!jefe.nacionalidad) { toast.error('La nacionalidad es obligatoria'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep(step)) setStep(step + 1); };
  const prevStep = () => setStep(step - 1);

  // Construir payload normalizado para el API
  const buildPayload = () => {
    // Servicios: solo incluir los que tienen valor
    const serviciosArr = Object.entries(servicios)
      .filter(([, estado]) => estado.trim() !== '')
      .map(([tipo, estado]) => ({ tipo: tipo as any, estado }));

    return {
      calleId,
      vivienda: {
        direccion: vivienda.direccion,
        tipo: vivienda.tipo,
        tenencia: vivienda.tenencia,
        materialConstruccion: vivienda.materialConstruccion || null,
        cantidadHabitaciones: vivienda.cantidadHabitaciones || null,
        cantidadBanos: vivienda.cantidadBanos || null,
        observaciones: vivienda.observaciones || null,
      },
      servicios: serviciosArr,
      programaSocial: {
        carnetPatria: programas.carnetPatria,
        codigoCarnetPatria: programas.codigoCarnetPatria || null,
        recibeClap: programas.recibeClap,
        otrosBeneficios: programas.otrosBeneficios || null,
        ingresoFamiliar: programas.ingresoFamiliar || null,
      },
      jefe: {
        nombre: jefe.nombre,
        cedula: jefe.cedula || null,
        nacionalidad: jefe.nacionalidad,
        fechaNacimiento: jefe.fechaNacimiento,
        genero: jefe.genero,
        estadoCivil: jefe.estadoCivil || null,
        telefono: jefe.telefono || null,
        email: jefe.email || null,
        escolaridad: jefe.escolaridad || null,
        ocupacion: jefe.ocupacion || null,
        lugarTrabajo: jefe.lugarTrabajo || null,
        enfermedad: jefe.enfermedad || null,
        pensionado: jefe.pensionado,
        discapacidad: jefe.discapacidad,
        tipoDiscapacidad: jefe.tipoDiscapacidad || null,
        embarazada: jefe.embarazada,
        lactancia: jefe.lactancia,
        esVotante: jefe.esVotante,
        votaEnEscuela: jefe.votaEnEscuela,
        centroVotacion: jefe.centroVotacion || null,
        registrosSalud: (jefe.registrosSalud || []).map((r: any) => ({
          enfermedadId: r.enfermedadId,
          medicamentoId: r.medicamentoId || null,
          dosis: r.dosis || null,
          frecuencia: r.frecuencia || null,
          cantidadMes: r.cantidadMes ? parseFloat(String(r.cantidadMes)) : null,
          severidad: r.severidad || null,
          observaciones: r.observaciones || null,
          activo: r.activo !== undefined ? r.activo : true,
        })),
      },
      miembros: miembros
        .filter((m) => m.nombre.trim() !== '')
        .map((m) => ({
          nombre: m.nombre,
          cedula: m.cedula || null,
          nacionalidad: m.nacionalidad,
          fechaNacimiento: m.fechaNacimiento,
          genero: m.genero,
          parentesco: m.parentesco || null,
          estadoCivil: m.estadoCivil || null,
          escolaridad: m.escolaridad || null,
          ocupacion: m.ocupacion || null,
          lugarTrabajo: m.lugarTrabajo || null,
          pensionado: m.pensionado,
          discapacidad: m.discapacidad,
          tipoDiscapacidad: m.tipoDiscapacidad || null,
          embarazada: m.embarazada,
          lactancia: m.lactancia,
          esVotante: m.esVotante,
          votaEnEscuela: m.votaEnEscuela,
          centroVotacion: m.centroVotacion || null,
          registrosSalud: (m.registrosSalud || []).map((r: any) => ({
            enfermedadId: r.enfermedadId,
            medicamentoId: r.medicamentoId || null,
            dosis: r.dosis || null,
            frecuencia: r.frecuencia || null,
            cantidadMes: r.cantidadMes ? parseFloat(String(r.cantidadMes)) : null,
            severidad: r.severidad || null,
            observaciones: r.observaciones || null,
            activo: r.activo !== undefined ? r.activo : true,
          })),
        })),
    };
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      toast.error('Revise los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const payload = buildPayload();
      if (editId) {
        (payload as any).id = editId;
      }
      const res = await apiFetch('/api/familias', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      try { sessionStorage.removeItem(CENSO_DRAFT_KEY); } catch { /* ignore */ }

      toast.success(editId ? '¡Familia actualizada exitosamente!' : '¡Familia censada exitosamente!');
      const role = session?.user?.role;
      router.push(role === 'ADMIN' ? '/dashboard/familias' : '/mi-calle/familias');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar el censo');
    } finally {
      setLoading(false);
    }
  };

  // Opciones de select
  const tiposVivienda = ['Casa', 'Apartamento', 'Rancho', 'Quinta', 'Habitación', 'Otro'];
  const tiposTenencia = ['Propia', 'Alquilada', 'Prestada', 'Invadida', 'Herencia', 'Otro'];
  const materialesConstruccion = ['Bloque', 'Bahareque', 'Zinc', 'Madera', 'Mixto', 'Otro'];
  const opcionesAgua = ['Tubería directa', 'Cisterna', 'Pozo', 'No tiene'];
  const opcionesElectricidad = ['Sí', 'No', 'Irregular'];
  const opcionesGas = ['Directo', 'Bombona', 'Leña', 'No tiene'];
  const opcionesSiNo = ['Sí', 'No'];
  const opcionesAseo = ['Sí', 'No', 'Irregular'];
  const opcionesTelefono = ['Fijo', 'Solo Celular', 'No tiene'];
  const estadosCiviles = ['Soltero/a', 'Casado/a', 'Concubino/a', 'Divorciado/a', 'Viudo/a'];
  const escolaridades = ['Ninguna', 'Preescolar', 'Primaria', 'Secundaria', 'Bachillerato', 'Técnico Superior', 'Universitaria', 'Postgrado'];
  const parentescos = ['Esposo/a', 'Hijo/a', 'Nieto/a', 'Padre/Madre', 'Hermano/a', 'Abuelo/a', 'Tío/a', 'Sobrino/a', 'Primo/a', 'Cuñado/a', 'Suegro/a', 'Yerno/Nuera', 'Otro'];
  const ingresosFamiliares = ['Menos de 1 salario mínimo', '1 a 2 salarios mínimos', '2 a 3 salarios mínimos', 'Más de 3 salarios mínimos'];

  const steps = [
    { n: 1, label: 'Vivienda y Servicios', icon: FiHome },
    { n: 2, label: 'Grupo Familiar', icon: FiUsers },
  ];

  const Req = ({ children }: { children: React.ReactNode }) => (
    <label className="input-label">{children} <span className="text-red-400">*</span></label>
  );
  const Opt = ({ children }: { children: React.ReactNode }) => (
    <label className="input-label">{children}</label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in pb-8">
      <div>
        <h2 className="text-2xl font-bold text-white">{editId ? 'Editar Familia Censada' : 'Censar Nueva Familia'}</h2>
        <p className="text-slate-500 mt-1">{editId ? 'Actualice los datos del formulario de censo' : 'Complete el formulario de censo paso a paso'}</p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {steps.map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            onClick={() => { if (n < step || validateStep(step)) setStep(n); }}
            className={`flex-1 p-2.5 sm:p-3 rounded-xl flex items-center gap-1.5 justify-center text-xs sm:text-sm font-medium transition-all
              ${step === n ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' :
              n < step ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' :
              'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {n < step ? <FiCheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{n}</span>
          </button>
        ))}
      </div>

      {/* Selección de calle */}
      <div className="glass-card p-4 sm:p-5">
        <Req>Calle / Sector</Req>
        <select value={calleId} onChange={(e) => { setCalleId(e.target.value); clearError('calleId'); }} className="select-field" required>
          <option value="">Seleccionar calle...</option>
          {calles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} — {c.comunidad?.nombre?.replace('Consejo Comunal ', '')}
            </option>
          ))}
        </select>
      </div>

      {/* PASO 1: Datos de Vivienda y Servicios */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiHome className="w-5 h-5 text-blue-400" />
              Datos de la Vivienda
            </h3>

            <div>
            <Req>Dirección Exacta</Req>
            <input value={vivienda.direccion} onChange={(e) => setVivienda({ ...vivienda, direccion: e.target.value })}
              className="input-field" placeholder="Ej: Casa #15, Calle Principal, frente a la bodega" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Req>Tipo de Vivienda</Req>
              <select value={vivienda.tipo} onChange={(e) => setVivienda({ ...vivienda, tipo: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {tiposVivienda.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Req>Tenencia</Req>
              <select value={vivienda.tenencia} onChange={(e) => setVivienda({ ...vivienda, tenencia: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {tiposTenencia.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Opt>Material de Construcción</Opt>
              <select value={vivienda.materialConstruccion} onChange={(e) => setVivienda({ ...vivienda, materialConstruccion: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {materialesConstruccion.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Opt>Nº Habitaciones</Opt>
              <input type="number" min="0" max="20" value={vivienda.cantidadHabitaciones}
                onChange={(e) => setVivienda({ ...vivienda, cantidadHabitaciones: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <Opt>Nº Baños</Opt>
              <input type="number" min="0" max="10" value={vivienda.cantidadBanos}
                onChange={(e) => setVivienda({ ...vivienda, cantidadBanos: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
          </div>

          <div>
            <Opt>Observaciones</Opt>
            <textarea value={vivienda.observaciones} onChange={(e) => setVivienda({ ...vivienda, observaciones: e.target.value })}
              className="input-field" rows={2} placeholder="Observaciones sobre la vivienda..." />
          </div>

          </div>

          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiZap className="w-5 h-5 text-yellow-400" />
              Servicios Básicos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Opt>Servicio de Agua</Opt>
                <select value={servicios.AGUA} onChange={(e) => setServicios({ ...servicios, AGUA: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesAgua.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Electricidad</Opt>
                <select value={servicios.ELECTRICIDAD} onChange={(e) => setServicios({ ...servicios, ELECTRICIDAD: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesElectricidad.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Gas</Opt>
                <select value={servicios.GAS} onChange={(e) => setServicios({ ...servicios, GAS: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesGas.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Internet</Opt>
                <select value={servicios.INTERNET} onChange={(e) => setServicios({ ...servicios, INTERNET: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesSiNo.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Aseo Urbano</Opt>
                <select value={servicios.ASEO} onChange={(e) => setServicios({ ...servicios, ASEO: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesAseo.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <Opt>Telefonía</Opt>
                <select value={servicios.TELEFONO} onChange={(e) => setServicios({ ...servicios, TELEFONO: e.target.value })} className="select-field">
                  <option value="">Seleccionar...</option>
                  {opcionesTelefono.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-emerald-400" />
              Programas Sociales y Economía
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <input type="checkbox" checked={programas.carnetPatria}
                    onChange={(e) => setProgramas({ ...programas, carnetPatria: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-blue-500" />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Carnet de la Patria</span>
                    <p className="text-xs text-slate-500">¿La familia posee carnet?</p>
                  </div>
                </label>
                {programas.carnetPatria && (
                  <div className="ml-8">
                    <Opt>Código del Carnet</Opt>
                    <input value={programas.codigoCarnetPatria}
                      onChange={(e) => setProgramas({ ...programas, codigoCarnetPatria: e.target.value })}
                      className="input-field text-sm" placeholder="Código del carnet" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <input type="checkbox" checked={programas.recibeClap}
                    onChange={(e) => setProgramas({ ...programas, recibeClap: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-800 border-slate-600 text-emerald-500" />
                  <div>
                    <span className="text-sm text-slate-300 font-medium">Recibe CLAP</span>
                    <p className="text-xs text-slate-500">¿Reciben caja CLAP?</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Opt>Ingreso Familiar</Opt>
                <select value={programas.ingresoFamiliar}
                  onChange={(e) => setProgramas({ ...programas, ingresoFamiliar: e.target.value })} className="select-field">
                  <option value="">Seleccionar rango...</option>
                  {ingresosFamiliares.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <Opt>Otros Beneficios Sociales</Opt>
                <input value={programas.otrosBeneficios}
                  onChange={(e) => setProgramas({ ...programas, otrosBeneficios: e.target.value })}
                  className="input-field" placeholder="Hogares de la Patria, Misiones, etc." />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={nextStep} className="btn-primary flex items-center gap-2">
              Siguiente <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Jefe de Familia y Miembros */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <FiUser className="w-5 h-5 text-emerald-400" />
              Datos del Jefe de Familia
            </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Req>Nombre Completo</Req>
              <input value={jefe.nombre} onChange={(e) => setJefe({ ...jefe, nombre: e.target.value })}
                className="input-field" placeholder="Nombre y apellido" />
            </div>
            <div>
              <Req>Cédula de Identidad</Req>
              <div className="flex gap-2">
                <select value={jefe.nacionalidad} onChange={(e) => setJefe({ ...jefe, nacionalidad: e.target.value })}
                  className="select-field w-20 flex-shrink-0">
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <input value={jefe.cedula} onChange={(e) => setJefe({ ...jefe, cedula: e.target.value })}
                  className="input-field flex-1" placeholder="12345678" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Req>Fecha de Nacimiento</Req>
              <input type="date" value={jefe.fechaNacimiento} onChange={(e) => setJefe({ ...jefe, fechaNacimiento: e.target.value })} className="input-field" />
            </div>
            <div>
              <Req>Género</Req>
              <select value={jefe.genero} onChange={(e) => setJefe({ ...jefe, genero: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <Opt>Estado Civil</Opt>
              <select value={jefe.estadoCivil} onChange={(e) => setJefe({ ...jefe, estadoCivil: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {estadosCiviles.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Opt>Teléfono</Opt>
              <input value={jefe.telefono} onChange={(e) => setJefe({ ...jefe, telefono: e.target.value })}
                className="input-field" placeholder="0414-1234567" />
            </div>
            <div>
              <Opt>Email</Opt>
              <input type="email" value={jefe.email} onChange={(e) => setJefe({ ...jefe, email: e.target.value })}
                className="input-field" placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Opt>Nivel de Escolaridad</Opt>
              <select value={jefe.escolaridad} onChange={(e) => setJefe({ ...jefe, escolaridad: e.target.value })} className="select-field">
                <option value="">Seleccionar...</option>
                {escolaridades.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <Opt>Ocupación</Opt>
              <input value={jefe.ocupacion} onChange={(e) => setJefe({ ...jefe, ocupacion: e.target.value })}
                className="input-field" placeholder="Ej: Comerciante, Docente..." />
            </div>
          </div>

          <div>
            <Opt>Lugar de Trabajo</Opt>
            <input value={jefe.lugarTrabajo} onChange={(e) => setJefe({ ...jefe, lugarTrabajo: e.target.value })}
              className="input-field" placeholder="Nombre de empresa o lugar" />
          </div>

          <div>
            <Opt>Enfermedades Crónicas</Opt>
            <input value={jefe.enfermedad} onChange={(e) => setJefe({ ...jefe, enfermedad: e.target.value })}
              className="input-field" placeholder="Ej: Diabetes, Hipertensión, Ninguna..." />
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-slate-700/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={jefe.pensionado} onChange={(e) => setJefe({ ...jefe, pensionado: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm text-slate-400">Pensionado</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={jefe.discapacidad} onChange={(e) => setJefe({ ...jefe, discapacidad: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500" />
              <span className="text-sm text-slate-400">Discapacidad</span>
            </label>
            {jefe.genero === 'F' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jefe.embarazada} onChange={(e) => setJefe({ ...jefe, embarazada: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500 focus:ring-pink-500" />
                  <span className="text-sm text-slate-400">Embarazada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={jefe.lactancia} onChange={(e) => setJefe({ ...jefe, lactancia: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500 focus:ring-pink-500" />
                  <span className="text-sm text-slate-400">Lactancia</span>
                </label>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={jefe.esVotante} onChange={(e) => setJefe({ ...jefe, esVotante: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-500" />
              <span className="text-sm text-slate-400">Es Votante</span>
            </label>
          </div>
          {jefe.esVotante && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <Opt>Centro de Votación</Opt>
                <input value={jefe.centroVotacion || ''} onChange={(e) => setJefe({ ...jefe, centroVotacion: e.target.value })}
                  className="input-field" placeholder="Nombre de la escuela o centro..." />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 w-full">
                  <input type="checkbox" checked={jefe.votaEnEscuela} onChange={(e) => setJefe({ ...jefe, votaEnEscuela: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500 focus:ring-teal-500" />
                  <span className="text-sm text-slate-300">¿Vota en la Escuela Tricentenaria?</span>
                </label>
              </div>
            </div>
          )}
          {jefe.discapacidad && (
            <div>
              <Opt>Tipo de Discapacidad</Opt>
              <input value={jefe.tipoDiscapacidad} onChange={(e) => setJefe({ ...jefe, tipoDiscapacidad: e.target.value })}
                className="input-field" placeholder="Tipo de discapacidad" />
            </div>
          )}
          
          <HealthRecordsSection
            registros={jefe.registrosSalud || []}
            onChange={(updated) => setJefe({ ...jefe, registrosSalud: updated })}
            catalogEnfermedades={catalogEnfermedades}
            catalogMedicamentos={catalogMedicamentos}
            onMutateEnfermedades={mutateEnfermedades}
            onMutateMedicamentos={mutateMedicamentos}
          />
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-purple-400" />
                Miembros del Hogar ({miembros.length})
              </h3>
              <button onClick={addMiembro} className="btn-primary flex items-center gap-2 text-sm py-2">
                <FiPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Agregar</span> Miembro
              </button>
            </div>

            {miembros.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FiUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se han agregado miembros</p>
                <p className="text-xs mt-1">Haga clic en &quot;Agregar Miembro&quot; para añadir personas al hogar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {miembros.map((m, i) => (
                  <div key={i} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-slate-300">Miembro #{i + 1}</h4>
                      <button onClick={() => removeMiembro(i)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <Req>Nombre Completo</Req>
                        <input value={m.nombre} onChange={(e) => updateMiembro(i, 'nombre', e.target.value)} className="input-field text-sm py-2" placeholder="Nombre y apellido" />
                      </div>
                      <div>
                        <Opt>Cédula</Opt>
                        <div className="flex gap-1">
                          <select value={m.nacionalidad} onChange={(e) => updateMiembro(i, 'nacionalidad', e.target.value)} className="select-field text-sm py-2 w-16">
                            <option value="V">V</option>
                            <option value="E">E</option>
                          </select>
                          <input value={m.cedula} onChange={(e) => updateMiembro(i, 'cedula', e.target.value)} className="input-field text-sm py-2 flex-1" placeholder="12345678" />
                        </div>
                      </div>
                      <div>
                        <Req>Fecha de Nacimiento</Req>
                        <input type="date" value={m.fechaNacimiento} onChange={(e) => updateMiembro(i, 'fechaNacimiento', e.target.value)} className="input-field text-sm py-2" />
                      </div>
                      <div>
                        <Req>Género</Req>
                        <select value={m.genero} onChange={(e) => updateMiembro(i, 'genero', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <Req>Parentesco</Req>
                        <select value={m.parentesco} onChange={(e) => updateMiembro(i, 'parentesco', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {parentescos.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Estado Civil</Opt>
                        <select value={m.estadoCivil} onChange={(e) => updateMiembro(i, 'estadoCivil', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {estadosCiviles.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Escolaridad</Opt>
                        <select value={m.escolaridad} onChange={(e) => updateMiembro(i, 'escolaridad', e.target.value)} className="select-field text-sm py-2">
                          <option value="">Seleccionar...</option>
                          {escolaridades.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <Opt>Ocupación</Opt>
                        <input value={m.ocupacion} onChange={(e) => updateMiembro(i, 'ocupacion', e.target.value)} className="input-field text-sm py-2" placeholder="Ocupación" />
                      </div>
                      <div>
                        <Opt>Enfermedades / Salud</Opt>
                        <input value={m.salud} onChange={(e) => updateMiembro(i, 'salud', e.target.value)} className="input-field text-sm py-2" placeholder="Condiciones de salud..." />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-slate-700/30">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={m.pensionado} onChange={(e) => updateMiembro(i, 'pensionado', e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500" />
                        <span className="text-xs text-slate-400">Pensionado</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={m.discapacidad} onChange={(e) => updateMiembro(i, 'discapacidad', e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500" />
                        <span className="text-xs text-slate-400">Discapacidad</span>
                      </label>
                      {m.genero === 'F' && (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={m.embarazada} onChange={(e) => updateMiembro(i, 'embarazada', e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500" />
                            <span className="text-xs text-slate-400">Embarazada</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={m.lactancia} onChange={(e) => updateMiembro(i, 'lactancia', e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-pink-500" />
                            <span className="text-xs text-slate-400">Lactancia</span>
                          </label>
                        </>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={m.esVotante} onChange={(e) => updateMiembro(i, 'esVotante', e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500" />
                        <span className="text-xs text-slate-400">Es Votante</span>
                      </label>
                      {m.discapacidad && (
                        <div className="flex-1 min-w-[180px]">
                          <input value={m.tipoDiscapacidad} onChange={(e) => updateMiembro(i, 'tipoDiscapacidad', e.target.value)}
                            className="input-field text-sm py-1.5" placeholder="Tipo de discapacidad" />
                        </div>
                      )}
                    </div>
                    {m.esVotante && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-700/30">
                        <div>
                          <Opt>Centro de Votación</Opt>
                          <input value={m.centroVotacion || ''} onChange={(e) => updateMiembro(i, 'centroVotacion', e.target.value)}
                            className="input-field text-sm py-2" placeholder="Lugar de votación..." />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={m.votaEnEscuela} onChange={(e) => updateMiembro(i, 'votaEnEscuela', e.target.checked)}
                              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-teal-500" />
                            <span className="text-sm text-slate-300">¿Vota en la Escuela Tricentenaria?</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <HealthRecordsSection
                      registros={m.registrosSalud || []}
                      onChange={(updated) => updateMiembro(i, 'registrosSalud', updated)}
                      catalogEnfermedades={catalogEnfermedades}
                      catalogMedicamentos={catalogMedicamentos}
                      onMutateEnfermedades={mutateEnfermedades}
                      onMutateMedicamentos={mutateMedicamentos}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen y envío */}
          <div className="glass-card p-5 sm:p-6 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-blue-400" />
              Resumen del Censo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-blue-400">{miembros.length + 1}</p>
                <p className="text-xs text-slate-500">Personas</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-emerald-400">{vivienda.tipo || '—'}</p>
                <p className="text-xs text-slate-500">Vivienda</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-yellow-400">{programas.carnetPatria ? 'Sí' : 'No'}</p>
                <p className="text-xs text-slate-500">Carnet Patria</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-xl text-center">
                <p className="text-lg font-bold text-cyan-400">{programas.recibeClap ? 'Sí' : 'No'}</p>
                <p className="text-xs text-slate-500">CLAP</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
            <button onClick={prevStep} className="btn-secondary flex items-center justify-center gap-2">
              <FiChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-8 text-lg disabled:opacity-50">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Guardar Censo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
