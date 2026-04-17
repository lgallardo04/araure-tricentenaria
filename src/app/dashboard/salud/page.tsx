// =============================================================
// Módulo de Salud — Dashboard BI
// Reportes y métricas de enfermedades, medicamentos y demanda
// Tablas cruzadas: Medicamento X en Comunidad Y
// Filtros jerárquicos: Comunidad > Calle
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  FiActivity, FiFilter, FiPlus, FiTrash2, FiHeart,
  FiAlertTriangle, FiBarChart2, FiPackage
} from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface SaludReporte {
  totalRegistros: number;
  totalConMedicamento: number;
  totalSinMedicamento: number;
  enfermedadesTop: { id: string; nombre: string; tipo: string; cantidad: number }[];
  medicamentosDemanda: {
    id: string; nombre: string; principioActivo: string;
    presentacion: string | null; unidad: string | null;
    pacientes: number; cantidadMesTotal: number;
  }[];
  porComunidad: { id: string; nombre: string; enfermedades: number; conMedicamento: number }[];
  porCalle: { id: string; nombre: string; comunidad: string; enfermedades: number; conMedicamento: number }[];
  porTipoEnfermedad: Record<string, number>;
  porSeveridad: Record<string, number>;
  demandaCruzada: Record<string, Record<string, { pacientes: number; cantidadMes: number }>>;
}

interface Comunidad { id: string; nombre: string; }
interface Calle { id: string; nombre: string; comunidadId: string; comunidad: { id: string; nombre: string }; }

// Modal para crear registros rápidos
interface Enfermedad { id: string; nombre: string; tipo: string; }
interface Medicamento { id: string; nombre: string; principioActivo: string; presentacion?: string; unidad?: string; }
interface Familia { id: string; jfNombre: string; jfCedula: string; miembros: { id: string; nombre: string; cedula?: string }[]; }

export default function SaludPage() {
  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // BI Report URL
  const params = new URLSearchParams();
  if (filtroCalle) params.set('calleId', filtroCalle);
  else if (filtroComunidad) params.set('comunidadId', filtroComunidad);
  const reporteUrl = `/api/salud/reportes${params.toString() ? '?' + params.toString() : ''}`;

  const { data: reporte, error, isLoading, mutate } = useSWR<SaludReporte>(reporteUrl);

  // Data for modal
  const { data: enfermedades = [] } = useSWR<Enfermedad[]>('/api/enfermedades');
  const { data: medicamentos = [] } = useSWR<Medicamento[]>('/api/medicamentos');
  const { data: familias = [] } = useSWR<Familia[]>('/api/familias');

  // Form state for quick add
  const [form, setForm] = useState({
    personaType: 'jefe' as 'jefe' | 'miembro',
    familiaId: '',
    miembroId: '',
    enfermedadId: '',
    medicamentoId: '',
    dosis: '',
    frecuencia: '',
    cantidadMes: '',
    severidad: '',
    observaciones: '',
  });

  const handleSubmit = async () => {
    if (!form.enfermedadId) { toast.error('Seleccione una enfermedad'); return; }
    if (form.personaType === 'jefe' && !form.familiaId) { toast.error('Seleccione una familia'); return; }
    if (form.personaType === 'miembro' && !form.miembroId) { toast.error('Seleccione un miembro'); return; }

    try {
      const body: any = {
        enfermedadId: form.enfermedadId,
        medicamentoId: form.medicamentoId || null,
        dosis: form.dosis || null,
        frecuencia: form.frecuencia || null,
        cantidadMes: form.cantidadMes || null,
        severidad: form.severidad || null,
        observaciones: form.observaciones || null,
      };
      if (form.personaType === 'jefe') body.familiaId = form.familiaId;
      else body.miembroId = form.miembroId;

      const res = await apiFetch('/api/salud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error((j as any).error || 'Error'); return; }
      toast.success('Registro de salud creado');
      setShowModal(false);
      setForm({ personaType: 'jefe', familiaId: '', miembroId: '', enfermedadId: '', medicamentoId: '', dosis: '', frecuencia: '', cantidadMes: '', severidad: '', observaciones: '' });
      mutate();
    } catch { toast.error('Error al crear registro'); }
  };

  const selectedFamilia = familias.find(f => f.id === form.familiaId);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">No se pudieron cargar los datos de salud.</p>
        <button type="button" onClick={() => mutate()} className="btn-primary px-4 py-2">Reintentar</button>
      </div>
    );
  }

  if (isLoading || !reporte) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando módulo de salud...</p>
        </div>
      </div>
    );
  }

  const colors = [
    'rgba(239, 68, 68, 0.7)', 'rgba(234, 179, 8, 0.7)',
    'rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)',
    'rgba(168, 85, 247, 0.7)', 'rgba(249, 115, 22, 0.7)',
    'rgba(14, 165, 233, 0.7)', 'rgba(236, 72, 153, 0.7)',
    'rgba(99, 102, 241, 0.7)', 'rgba(20, 184, 166, 0.7)',
  ];

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
  };
  const barOpts = {
    ...chartOpts, indexAxis: 'y' as const,
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
      y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
    },
  };

  // === Charts Data ===
  const enfermedadesBarData = {
    labels: reporte.enfermedadesTop.slice(0, 10).map(e => e.nombre),
    datasets: [{
      label: 'Casos',
      data: reporte.enfermedadesTop.slice(0, 10).map(e => e.cantidad),
      backgroundColor: colors,
      borderRadius: 6,
    }],
  };

  const tipoEnfData = {
    labels: Object.keys(reporte.porTipoEnfermedad),
    datasets: [{
      data: Object.values(reporte.porTipoEnfermedad),
      backgroundColor: colors.slice(0, Object.keys(reporte.porTipoEnfermedad).length),
      borderWidth: 2,
    }],
  };

  const severidadData = {
    labels: Object.keys(reporte.porSeveridad),
    datasets: [{
      data: Object.values(reporte.porSeveridad),
      backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(107, 114, 128, 0.4)'],
      borderWidth: 2,
    }],
  };

  const medicamentosBarData = {
    labels: reporte.medicamentosDemanda.slice(0, 10).map(m => m.nombre),
    datasets: [{
      label: 'Pacientes',
      data: reporte.medicamentosDemanda.slice(0, 10).map(m => m.pacientes),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 6,
    }],
  };

  // Filtro label
  const filtroLabel = filtroCalle
    ? calles.find(c => c.id === filtroCalle)?.nombre || 'Calle'
    : filtroComunidad
    ? comunidades.find(c => c.id === filtroComunidad)?.nombre?.replace('Consejo Comunal ', '') || 'Comunidad'
    : 'Toda la Comuna';

  // Demanda cruzada keys
  const demandaMeds = Object.keys(reporte.demandaCruzada);
  const demandaComs = new Set<string>();
  for (const med of demandaMeds) {
    for (const com of Object.keys(reporte.demandaCruzada[med])) {
      demandaComs.add(com);
    }
  }
  const demandaComsArr = Array.from(demandaComs);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiActivity className="w-6 h-6 text-emerald-400" />
            Módulo de Salud
          </h2>
          <p className="text-slate-500 mt-1">
            BI de enfermedades y medicamentos — <span className="text-emerald-400">{filtroLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FiFilter className="w-4 h-4 text-slate-500" />
          <select value={filtroComunidad} onChange={(e) => { setFiltroComunidad(e.target.value); setFiltroCalle(''); }} className="select-field max-w-[200px] text-sm">
            <option value="">Todas las comunidades</option>
            {comunidades.map((c) => (<option key={c.id} value={c.id}>{c.nombre.replace('Consejo Comunal ', '')}</option>))}
          </select>
          {filtroComunidad && (
            <select value={filtroCalle} onChange={(e) => setFiltroCalle(e.target.value)} className="select-field max-w-[180px] text-sm">
              <option value="">Todas las calles</option>
              {calles.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
            </select>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary px-3 py-2 text-sm flex items-center gap-1.5">
            <FiPlus className="w-4 h-4" /> Registrar
          </button>
        </div>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center border-l-4 border-l-red-500">
          <p className="text-2xl font-bold text-red-400">{reporte.totalRegistros}</p>
          <p className="text-xs text-slate-500 mt-1">Registros de Salud</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-emerald-500">
          <p className="text-2xl font-bold text-emerald-400">{reporte.totalConMedicamento}</p>
          <p className="text-xs text-slate-500 mt-1">Con Tratamiento</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-yellow-500">
          <p className="text-2xl font-bold text-yellow-400">{reporte.totalSinMedicamento}</p>
          <p className="text-xs text-slate-500 mt-1">Sin Medicamento</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-blue-500">
          <p className="text-2xl font-bold text-blue-400">{reporte.enfermedadesTop.length}</p>
          <p className="text-xs text-slate-500 mt-1">Enfermedades Distintas</p>
        </div>
      </div>

      {/* Accesos rápidos a catálogos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/salud/enfermedades" className="glass-card p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <FiHeart className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Catálogo de Enfermedades</p>
            <p className="text-xs text-slate-500">Gestionar enfermedades</p>
          </div>
        </Link>
        <Link href="/dashboard/salud/medicamentos" className="glass-card p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <FiPackage className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Catálogo de Medicamentos</p>
            <p className="text-xs text-slate-500">Gestionar medicamentos</p>
          </div>
        </Link>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4 text-red-400" /> Top Enfermedades
          </h3>
          <div className="h-80">
            {reporte.enfermedadesTop.length > 0 ? (
              <Bar data={enfermedadesBarData} options={barOpts as any} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos registrados</div>
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiPackage className="w-4 h-4 text-blue-400" /> Demanda de Medicamentos
          </h3>
          <div className="h-80">
            {reporte.medicamentosDemanda.length > 0 ? (
              <Bar data={medicamentosBarData} options={barOpts as any} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos registrados</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Tipo de Enfermedad</h3>
          <div className="h-64">
            {Object.keys(reporte.porTipoEnfermedad).length > 0 ? (
              <Doughnut data={tipoEnfData} options={chartOpts} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos</div>
            )}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Severidad</h3>
          <div className="h-64">
            <Doughnut data={severidadData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Tabla BI: Demanda Cruzada (Medicamento × Comunidad) */}
      {demandaMeds.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-purple-400" />
            📊 Demanda de Medicamentos por Comunidad (BI)
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Cantidad de pacientes y unidades/mes estimadas de cada medicamento por comunidad
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Medicamento</th>
                {demandaComsArr.map(com => (
                  <th key={com} className="text-center py-3 px-2 text-slate-400 font-medium">{com}</th>
                ))}
                <th className="text-center py-3 px-2 text-white font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {demandaMeds.map(med => {
                let totalPac = 0;
                let totalCant = 0;
                return (
                  <tr key={med} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-2 px-2 text-blue-300 font-medium">{med}</td>
                    {demandaComsArr.map(com => {
                      const cell = reporte.demandaCruzada[med]?.[com];
                      if (cell) { totalPac += cell.pacientes; totalCant += cell.cantidadMes; }
                      return (
                        <td key={com} className="py-2 px-2 text-center text-slate-300">
                          {cell ? (
                            <div>
                              <span className="text-emerald-400 font-semibold">{cell.pacientes}</span>
                              {cell.cantidadMes > 0 && (
                                <span className="text-slate-500 text-xs ml-1">({cell.cantidadMes}/mes)</span>
                              )}
                            </div>
                          ) : <span className="text-slate-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center">
                      <span className="text-white font-bold">{totalPac}</span>
                      {totalCant > 0 && <span className="text-slate-500 text-xs ml-1">({totalCant}/mes)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla por comunidad */}
      {reporte.porComunidad.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4">Salud por Comunidad</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400">Comunidad</th>
                <th className="text-center py-3 px-2 text-red-400">Enfermedades</th>
                <th className="text-center py-3 px-2 text-emerald-400">Con Medicamento</th>
              </tr>
            </thead>
            <tbody>
              {reporte.porComunidad.map(item => (
                <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-2 text-slate-300 font-medium">{item.nombre}</td>
                  <td className="py-2 px-2 text-center text-red-300">{item.enfermedades}</td>
                  <td className="py-2 px-2 text-center text-emerald-300">{item.conMedicamento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para crear registro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiActivity className="text-emerald-400" /> Nuevo Registro de Salud
            </h3>

            <div className="space-y-4">
              {/* Tipo de persona */}
              <div>
                <label className="label-field">¿Quién?</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm({...form, personaType: 'jefe', miembroId: ''})}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.personaType === 'jefe' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Jefe de Familia
                  </button>
                  <button type="button" onClick={() => setForm({...form, personaType: 'miembro', familiaId: ''})}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.personaType === 'miembro' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    Miembro
                  </button>
                </div>
              </div>

              {/* Selección de persona */}
              {form.personaType === 'jefe' ? (
                <div>
                  <label className="label-field">Familia (Jefe)</label>
                  <select value={form.familiaId} onChange={e => setForm({...form, familiaId: e.target.value})} className="select-field">
                    <option value="">Seleccionar...</option>
                    {familias.map(f => (<option key={f.id} value={f.id}>{f.jfNombre} — CI: {f.jfCedula}</option>))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label-field">Familia</label>
                    <select value={form.familiaId} onChange={e => setForm({...form, familiaId: e.target.value, miembroId: ''})} className="select-field">
                      <option value="">Seleccionar familia...</option>
                      {familias.map(f => (<option key={f.id} value={f.id}>{f.jfNombre}</option>))}
                    </select>
                  </div>
                  {selectedFamilia && selectedFamilia.miembros.length > 0 && (
                    <div>
                      <label className="label-field">Miembro</label>
                      <select value={form.miembroId} onChange={e => setForm({...form, miembroId: e.target.value})} className="select-field">
                        <option value="">Seleccionar miembro...</option>
                        {selectedFamilia.miembros.map(m => (<option key={m.id} value={m.id}>{m.nombre}{m.cedula ? ` — CI: ${m.cedula}` : ''}</option>))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Enfermedad */}
              <div>
                <label className="label-field">Enfermedad *</label>
                <select value={form.enfermedadId} onChange={e => setForm({...form, enfermedadId: e.target.value})} className="select-field">
                  <option value="">Seleccionar enfermedad...</option>
                  {enfermedades.map(e => (<option key={e.id} value={e.id}>{e.nombre} ({e.tipo})</option>))}
                </select>
              </div>

              {/* Medicamento */}
              <div>
                <label className="label-field">Medicamento (opcional)</label>
                <select value={form.medicamentoId} onChange={e => setForm({...form, medicamentoId: e.target.value})} className="select-field">
                  <option value="">Sin medicamento / Sin tratamiento</option>
                  {medicamentos.map(m => (<option key={m.id} value={m.id}>{m.nombre} — {m.principioActivo}{m.presentacion ? ` (${m.presentacion})` : ''}</option>))}
                </select>
              </div>

              {/* Tratamiento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Dosis</label>
                  <input type="text" value={form.dosis} onChange={e => setForm({...form, dosis: e.target.value})} className="input-field" placeholder="1 tab cada 8h" />
                </div>
                <div>
                  <label className="label-field">Frecuencia</label>
                  <select value={form.frecuencia} onChange={e => setForm({...form, frecuencia: e.target.value})} className="select-field">
                    <option value="">Seleccionar...</option>
                    <option>Diaria</option>
                    <option>Semanal</option>
                    <option>Mensual</option>
                    <option>Según necesidad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Cantidad / Mes</label>
                  <input type="number" step="0.1" value={form.cantidadMes} onChange={e => setForm({...form, cantidadMes: e.target.value})} className="input-field" placeholder="30" />
                </div>
                <div>
                  <label className="label-field">Severidad</label>
                  <select value={form.severidad} onChange={e => setForm({...form, severidad: e.target.value})} className="select-field">
                    <option value="">Seleccionar...</option>
                    <option>Leve</option>
                    <option>Moderada</option>
                    <option>Severa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Observaciones</label>
                <textarea value={form.observaciones} onChange={e => setForm({...form, observaciones: e.target.value})} className="input-field" rows={2} placeholder="Notas adicionales..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm">
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
