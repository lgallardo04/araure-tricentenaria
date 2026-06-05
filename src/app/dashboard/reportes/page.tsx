// =============================================================
// Reportes Estadísticos — Consolidado
// 3 Pestañas: Censo General, Demografía Poblacional, Salud
// Gráficos y datos detallados del censo con servicios y programas
// Filtros jerárquicos: Comunidad > Calle
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  FiBarChart2, FiFilter, FiDroplet, FiZap, FiDownload, FiBriefcase,
  FiUsers, FiMapPin, FiMap, FiX, FiUser, FiChevronRight,
  FiActivity, FiAlertTriangle, FiPackage, FiHeart
} from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

// ============ INTERFACES ============

interface Stats {
  totalFamilias: number;
  totalMiembros: number;
  totalMayores: number;
  totalMenores: number;
  totalPensionados: number;
  totalDiscapacidad: number;
  totalHombres: number;
  totalMujeres: number;
  totalEmbarazadas: number;
  totalLactancia: number;
  totalCarnetPatria: number;
  totalClap: number;
  totalComunidades: number;
  totalCalles: number;
  totalNinos: number;
  totalNinas: number;
  totalAdolescentes: number;
  totalAdultos: number;
  totalAbuelosHombres: number;
  totalAbuelasMujeres: number;
  totalTerceraEdad: number;
  totalVotantes: number;
  totalVotanEscuela: number;
  totalBebesNinos: number;
  totalBebesNinas: number;
  edadesPorRango: Record<string, number>;
  edadesPorRangoGenero: Record<string, { hombres: number, mujeres: number }>;
  servicios: {
    agua: Record<string, number>;
    electricidad: Record<string, number>;
    gas: Record<string, number>;
    internet: Record<string, number>;
    aseo: Record<string, number>;
  };
  tiposVivienda: Record<string, number>;
  tiposTenencia: Record<string, number>;
  poblacionPorComunidad: { nombre: string; totalFamilias: number; totalCalles: number }[];
}

interface DemografiaConteo {
  ninos: number;
  ninas: number;
  adolescentesM: number;
  adolescentesF: number;
  adultosM: number;
  adultosF: number;
  abuelosHombres: number;
  abuelasMujeres: number;
  total: number;
}

interface DemografiaResponse {
  global: DemografiaConteo;
  porComunidad: { id: string; nombre: string; conteo: DemografiaConteo }[];
  porCalle: { id: string; nombre: string; comunidadNombre: string; comunidadId: string; conteo: DemografiaConteo }[];
  piramide: Record<string, { hombres: number; mujeres: number }>;
}

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

// ============ COMPONENT ============

type TabKey = 'censo' | 'demografia' | 'salud';

export default function ReportesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<TabKey>('censo');
  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');
  const [filtroDato, setFiltroDato] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Demografía specific
  const [filtroGrupo, setFiltroGrupo] = useState<'TODOS' | 'NINOS' | 'ADOL' | 'ADULT' | 'ABUELOS'>('TODOS');

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // ============ Censo Stats ============
  const statsParams = new URLSearchParams();
  if (filtroCalle) statsParams.set('calleId', filtroCalle);
  else if (filtroComunidad) statsParams.set('comunidadId', filtroComunidad);
  if (filtroDato) statsParams.set('filtroDato', filtroDato);
  const statsKey = `/api/estadisticas${statsParams.toString() ? '?' + statsParams.toString() : ''}`;
  const { data: stats, error: statsError, isLoading: statsLoading, mutate: mutateStats } = useSWR<Stats>(activeTab === 'censo' ? statsKey : null);

  // Locales
  const localesParams = new URLSearchParams();
  if (filtroCalle) localesParams.set('calleId', filtroCalle);
  else if (filtroComunidad) localesParams.set('comunidadId', filtroComunidad);
  const localesKey = `/api/locales-comerciales${localesParams.toString() ? '?' + localesParams.toString() : ''}`;
  const { data: locales = [] } = useSWR<any[]>(activeTab === 'censo' ? localesKey : null);

  // ============ Demografía ============
  const demoParams = new URLSearchParams();
  if (filtroCalle) demoParams.set('calleId', filtroCalle);
  else if (filtroComunidad) demoParams.set('comunidadId', filtroComunidad);
  const demoUrl = `/api/demografia${demoParams.toString() ? '?' + demoParams.toString() : ''}`;
  const { data: demoData, error: demoError, isLoading: demoLoading, mutate: mutateDemo } = useSWR<DemografiaResponse>(activeTab === 'demografia' ? demoUrl : null);

  // List of people for a specific group
  const groupMap: Record<string, string> = { NINOS: 'ninos', ADOL: 'adol', ADULT: 'adult', ABUELOS: 'abuelos' };
  const listParams = new URLSearchParams();
  if (filtroCalle) listParams.set('calleId', filtroCalle);
  else if (filtroComunidad) listParams.set('comunidadId', filtroComunidad);
  if (filtroGrupo !== 'TODOS') {
    listParams.set('list', 'true');
    listParams.set('grupo', groupMap[filtroGrupo]);
  }
  const listUrl = (activeTab === 'demografia' && filtroGrupo !== 'TODOS') ? `/api/demografia?${listParams.toString()}` : null;
  const { data: listData = [], isLoading: loadingList } = useSWR<any[]>(listUrl);

  // ============ Salud ============
  const saludParams = new URLSearchParams();
  if (filtroCalle) saludParams.set('calleId', filtroCalle);
  else if (filtroComunidad) saludParams.set('comunidadId', filtroComunidad);
  const saludUrl = `/api/salud/reportes${saludParams.toString() ? '?' + saludParams.toString() : ''}`;
  const { data: saludReporte, error: saludError, isLoading: saludLoading, mutate: mutateSalud } = useSWR<SaludReporte>(activeTab === 'salud' ? saludUrl : null);

  // ============ PDF Export ============
  const exportPDF = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generando PDF, por favor espera...', { id: 'pdf' });
      const element = document.getElementById('reporte-container');
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdfVariable = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdfVariable.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdfVariable.save(`Reporte_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Reporte exportado exitosamente', { id: 'pdf' });
    } catch (error) {
      console.error('Generación de PDF errónea:', error);
      toast.error('Error al exportar el PDF', { id: 'pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  // Common
  const filtroLabel = filtroCalle
    ? calles.find(c => c.id === filtroCalle)?.nombre || 'Calle seleccionada'
    : filtroComunidad
    ? comunidades.find(c => c.id === filtroComunidad)?.nombre?.replace('Consejo Comunal ', '') || 'Comunidad'
    : 'Toda la Comuna';

  const colors = [
    'rgba(99, 102, 241, 0.7)', 'rgba(59, 130, 246, 0.7)',
    'rgba(14, 165, 233, 0.7)', 'rgba(20, 184, 166, 0.7)',
    'rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)',
    'rgba(249, 115, 22, 0.7)', 'rgba(236, 72, 153, 0.7)',
    'rgba(239, 68, 68, 0.7)', 'rgba(168, 85, 247, 0.7)',
  ];

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
  };
  const barOpts = {
    ...chartOpts,
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
    },
  };

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'censo', label: 'Censo General', icon: FiBarChart2 },
    { key: 'demografia', label: 'Demografía', icon: FiUsers },
    { key: 'salud', label: 'Salud', icon: FiActivity },
  ];

  return (
    <div id="reporte-container" className="space-y-6 animate-fade-in pb-10 bg-slate-900 border-x border-t border-slate-900 px-2 pt-2 -mx-2 -mt-2">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reportes Estadísticos</h2>
          <p className="text-slate-500 mt-1">Análisis detallado del censo comunal — <span className="text-blue-400">{filtroLabel}</span></p>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-html2canvas-ignore>
          {isAdmin && (
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className={`btn-primary px-3 py-2 text-sm flex items-center gap-1.5 mr-2 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FiDownload className="w-4 h-4" />
              {isExporting ? 'Procesando...' : 'Exportar PDF'}
            </button>
          )}

          <FiFilter className="w-4 h-4 text-slate-500" />
          {activeTab === 'censo' && (
            <select
              value={filtroDato}
              onChange={(e) => setFiltroDato(e.target.value)}
              className="select-field max-w-[180px] text-sm bg-blue-900/20 border-blue-500/30 text-blue-400 font-semibold"
              title="Tipo de dato a filtrar"
            >
              <option value="">Filtro: Todos</option>
              <option value="MAYORES">Mayores de Edad</option>
              <option value="PENSIONADO">Pensionados</option>
              <option value="DISCAPACIDAD">Con Discapacidad</option>
              <option value="EMBARAZADA">Embarazadas</option>
              <option value="LACTANCIA">En Lactancia</option>
              <option value="CARNET_PATRIA">Carnet Patria</option>
              <option value="CLAP">Recibe CLAP</option>
            </select>
          )}

          <select
            value={filtroComunidad}
            onChange={(e) => { setFiltroComunidad(e.target.value); setFiltroCalle(''); }}
            className="select-field max-w-[200px] text-sm"
          >
            <option value="">{isAdmin ? 'Todas las comunidades' : 'Mi comunidad'}</option>
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre.replace('Consejo Comunal ', '')}</option>
            ))}
          </select>
          {filtroComunidad && (
            <select
              value={filtroCalle}
              onChange={(e) => setFiltroCalle(e.target.value)}
              className="select-field max-w-[180px] text-sm"
            >
              <option value="">Todas las calles</option>
              {calles.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50" data-html2canvas-ignore>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveTab(key); setFiltroGrupo('TODOS'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ============ TAB: CENSO GENERAL ============ */}
      {activeTab === 'censo' && (
        <>
          {statsError && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-400 text-sm">No se pudieron cargar los reportes.</p>
              <button type="button" onClick={() => mutateStats()} className="btn-primary px-4 py-2">Reintentar</button>
            </div>
          )}
          {statsLoading || !stats ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <CensoTab stats={stats} locales={locales} filtroDato={filtroDato} setFiltroDato={setFiltroDato} colors={colors} chartOpts={chartOpts} barOpts={barOpts} />
          )}
        </>
      )}

      {/* ============ TAB: DEMOGRAFÍA ============ */}
      {activeTab === 'demografia' && (
        <>
          {demoError && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-400 text-sm">No se pudieron cargar los datos demográficos.</p>
              <button type="button" onClick={() => mutateDemo()} className="btn-primary px-4 py-2">Reintentar</button>
            </div>
          )}
          {demoLoading || !demoData ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <DemografiaTab
              data={demoData}
              filtroGrupo={filtroGrupo}
              setFiltroGrupo={setFiltroGrupo}
              filtroLabel={filtroLabel}
              listData={listData}
              loadingList={loadingList}
              colors={colors}
              chartOpts={chartOpts}
            />
          )}
        </>
      )}

      {/* ============ TAB: SALUD ============ */}
      {activeTab === 'salud' && (
        <>
          {saludError && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-red-400 text-sm">No se pudieron cargar los datos de salud.</p>
              <button type="button" onClick={() => mutateSalud()} className="btn-primary px-4 py-2">Reintentar</button>
            </div>
          )}
          {saludLoading || !saludReporte ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : (
            <SaludTab reporte={saludReporte} colors={colors} chartOpts={chartOpts} barOpts={barOpts} />
          )}
        </>
      )}
    </div>
  );
}

// ============ CENSO TAB ============

function CensoTab({
  stats, locales, filtroDato, setFiltroDato, colors, chartOpts, barOpts,
}: {
  stats: Stats; locales: any[]; filtroDato: string;
  setFiltroDato: (v: string) => void; colors: string[];
  chartOpts: any; barOpts: any;
}) {
  const rangos = Object.keys(stats.edadesPorRangoGenero || {});
  const edadData = {
    labels: rangos,
    datasets: [
      { label: 'Hombres', data: rangos.map(r => stats.edadesPorRangoGenero[r].hombres), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 6 },
      { label: 'Mujeres', data: rangos.map(r => stats.edadesPorRangoGenero[r].mujeres), backgroundColor: 'rgba(236, 72, 153, 0.7)', borderRadius: 6 },
    ],
  };

  const generoData = {
    labels: ['Hombres', 'Mujeres'],
    datasets: [{ data: [stats.totalHombres, stats.totalMujeres], backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)'], borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)'], borderWidth: 2 }],
  };

  const demografiaData = {
    labels: ['Niños (<12)', 'Niñas (<12)', 'Adolescentes (12-17)', 'Adultos (18-59)', 'Abuelos (≥60)', 'Abuelas (≥60)'],
    datasets: [{
      data: [stats.totalNinos, stats.totalNinas, stats.totalAdolescentes, stats.totalAdultos, stats.totalAbuelosHombres, stats.totalAbuelasMujeres],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(249, 115, 22, 0.7)'],
      borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)', 'rgb(99, 102, 241)', 'rgb(34, 197, 94)', 'rgb(234, 179, 8)', 'rgb(249, 115, 22)'],
      borderWidth: 2,
    }],
  };

  const especialData = {
    labels: ['Pensionados', 'Discapacidad', 'Embarazadas', 'Lactancia'],
    datasets: [{
      data: [stats.totalPensionados, stats.totalDiscapacidad, stats.totalEmbarazadas, stats.totalLactancia],
      backgroundColor: ['rgba(234, 179, 8, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(196, 181, 253, 0.7)'],
      borderColor: ['rgb(234, 179, 8)', 'rgb(239, 68, 68)', 'rgb(236, 72, 153)', 'rgb(196, 181, 253)'], borderWidth: 2,
    }],
  };

  const comunidadData = {
    labels: stats.poblacionPorComunidad.map(c => c.nombre),
    datasets: [{ label: 'Familias', data: stats.poblacionPorComunidad.map(c => c.totalFamilias), backgroundColor: colors, borderRadius: 8 }],
  };

  const aguaData = {
    labels: ['Tubería', 'Cisterna', 'Pozo', 'No tiene'],
    datasets: [{ data: [stats.servicios?.agua?.tuberia || 0, stats.servicios?.agua?.cisterna || 0, stats.servicios?.agua?.pozo || 0, stats.servicios?.agua?.noTiene || 0], backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(14, 165, 233, 0.7)', 'rgba(20, 184, 166, 0.7)', 'rgba(107, 114, 128, 0.7)'], borderWidth: 2 }],
  };

  const programasData = {
    labels: ['Carnet de la Patria', 'Reciben CLAP', 'Sin programas'],
    datasets: [{ data: [stats.totalCarnetPatria, stats.totalClap, Math.max(0, stats.totalFamilias - Math.max(stats.totalCarnetPatria, stats.totalClap))], backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(107, 114, 128, 0.4)'], borderWidth: 2 }],
  };

  const viviendaKeys = Object.keys(stats.tiposVivienda || {});
  const viviendaData = viviendaKeys.length > 0 ? {
    labels: viviendaKeys,
    datasets: [{ data: Object.values(stats.tiposVivienda), backgroundColor: colors.slice(0, viviendaKeys.length), borderWidth: 2 }],
  } : null;

  return (
    <div className="space-y-6">
      {/* Resumen en números */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => setFiltroDato('')} title="Ver Todos">
          <p className="text-2xl font-bold text-blue-400">{stats.totalMiembros}</p>
          <p className="text-xs text-slate-500 mt-1">Población Total</p>
        </div>
        <div className="glass-card p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => setFiltroDato('')} title="Ver Familias">
          <p className="text-2xl font-bold text-emerald-400">{stats.totalFamilias}</p>
          <p className="text-xs text-slate-500 mt-1">Familias</p>
        </div>
        <div className={`glass-card p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors ${filtroDato === 'MAYORES' ? 'border-green-500/50 bg-slate-800/80' : ''}`} onClick={() => setFiltroDato(filtroDato === 'MAYORES' ? '' : 'MAYORES')} title="Filtrar Mayores de Edad">
          <p className="text-2xl font-bold text-green-400">{stats.totalMayores}</p>
          <p className="text-xs text-slate-500 mt-1">Mayores de Edad</p>
        </div>
        <div className={`glass-card p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors ${filtroDato === 'PENSIONADO' ? 'border-yellow-500/50 bg-slate-800/80' : ''}`} onClick={() => setFiltroDato(filtroDato === 'PENSIONADO' ? '' : 'PENSIONADO')} title="Filtrar Pensionados">
          <p className="text-2xl font-bold text-yellow-400">{stats.totalPensionados}</p>
          <p className="text-xs text-slate-500 mt-1">Pensionados</p>
        </div>
        <div className={`glass-card p-4 text-center cursor-pointer hover:bg-slate-800 transition-colors ${filtroDato === 'DISCAPACIDAD' ? 'border-red-500/50 bg-slate-800/80' : ''}`} onClick={() => setFiltroDato(filtroDato === 'DISCAPACIDAD' ? '' : 'DISCAPACIDAD')} title="Filtrar Personas con Discapacidad">
          <p className="text-2xl font-bold text-red-400">{stats.totalDiscapacidad}</p>
          <p className="text-xs text-slate-500 mt-1">Con Discapacidad</p>
        </div>
      </div>

      {/* Infocentro */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 rounded-xl p-4 mb-6 text-center shadow-lg animate-fade-in">
        <h3 className="text-lg md:text-xl font-bold text-blue-300 uppercase tracking-wider">
          El infocentro es el centro tecnológico de la comuna
        </h3>
      </div>

      {/* Electorales y Bebés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 text-center flex flex-col justify-center">
          <p className="text-4xl font-bold text-indigo-400">
            {stats.totalMayores > 0 ? Math.round((stats.totalVotantes / stats.totalMayores) * 100) : 0}%
          </p>
          <p className="text-sm font-semibold text-slate-300 mt-2">Porcentaje General de Votación</p>
          <p className="text-xs text-slate-500 mt-1">({stats.totalVotantes} de {stats.totalMayores} mayores de edad censados)</p>
        </div>
        <div className="glass-card p-5 text-center flex flex-col justify-center">
          <p className="text-4xl font-bold text-teal-400">{stats.totalVotanEscuela || 0}</p>
          <p className="text-sm font-semibold text-slate-300 mt-2">Personas que Votan en Escuelas</p>
        </div>
        <div className="glass-card p-5 text-center flex flex-col justify-center">
          <p className="text-4xl font-bold text-pink-400">{(stats.totalBebesNinos || 0) + (stats.totalBebesNinas || 0)}</p>
          <p className="text-sm font-semibold text-slate-300 mt-2">Población de 0 a 1 año</p>
          <p className="text-xs text-slate-500 mt-1 flex justify-center gap-3">
            <span>👦 Niños: <strong className="text-blue-400">{stats.totalBebesNinos || 0}</strong></span>
            <span>👧 Niñas: <strong className="text-pink-400">{stats.totalBebesNinas || 0}</strong></span>
          </p>
        </div>
      </div>

      {/* Demografía segmentada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-blue-400">{stats.totalNinos}</p><p className="text-xs text-slate-500">👦 Niños</p></div>
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-pink-400">{stats.totalNinas}</p><p className="text-xs text-slate-500">👧 Niñas</p></div>
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-indigo-400">{stats.totalAdolescentes}</p><p className="text-xs text-slate-500">🧑 Adolescentes</p></div>
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-green-400">{stats.totalAdultos}</p><p className="text-xs text-slate-500">🧑‍💼 Adultos</p></div>
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-yellow-400">{stats.totalAbuelosHombres}</p><p className="text-xs text-slate-500">👴 Abuelos</p></div>
        <div className="glass-card p-3 text-center"><p className="text-lg font-bold text-orange-400">{stats.totalAbuelasMujeres}</p><p className="text-xs text-slate-500">👵 Abuelas</p></div>
      </div>

      {/* Gráficos demográficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-blue-400" /> Distribución por Edad
          </h3>
          <div className="h-64 md:h-72"><Bar data={edadData} options={barOpts as any} /></div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Segmentación Demográfica</h3>
          <div className="h-64 md:h-72"><Doughnut data={demografiaData} options={chartOpts} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Distribución por Género</h3>
          <div className="h-64 md:h-72"><Doughnut data={generoData} options={chartOpts} /></div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Condiciones Especiales</h3>
          <div className="h-64 md:h-72"><Doughnut data={especialData} options={chartOpts} /></div>
        </div>
      </div>

      {/* Servicios y Programas */}
      <h3 className="text-lg font-semibold text-white pt-2">Servicios y Programas Sociales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><FiDroplet className="w-4 h-4 text-cyan-400" /> Servicio de Agua</h3>
          <div className="h-64 md:h-72"><Doughnut data={aguaData} options={chartOpts} /></div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2"><FiZap className="w-4 h-4 text-yellow-400" /> Programas Sociales</h3>
          <div className="h-64 md:h-72"><Doughnut data={programasData} options={chartOpts} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {viviendaData && (
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white mb-4">Tipos de Vivienda</h3>
            <div className="h-64 md:h-72"><Bar data={viviendaData} options={barOpts as any} /></div>
          </div>
        )}
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Familias por Comunidad</h3>
          <div className="h-64 md:h-72"><Bar data={comunidadData} options={barOpts as any} /></div>
        </div>
      </div>

      {/* Locales Comerciales */}
      <h3 className="text-lg font-semibold text-white pt-6 flex items-center gap-2">
        <FiBriefcase className="text-yellow-500 w-5 h-5" /> Locales Comerciales Censados ({locales.length})
      </h3>
      {locales.length === 0 ? (
        <div className="glass-card p-6 text-center text-slate-500"><p>No hay locales comerciales censados en esta área.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {locales.map((local: any) => (
            <div key={local.id} className="glass-card p-4 hover:border-yellow-500/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white text-base truncate pr-2" title={local.nombre}>{local.nombre}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${local.activo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {local.activo ? 'Activo' : 'Cerrado'}
                </span>
              </div>
              <p className="text-xs text-yellow-400 mb-2 font-medium">{local.tipoNegocio}</p>
              <div className="space-y-1 text-sm text-slate-300">
                {local.propietario && <p><span className="text-slate-500">Prop:</span> {local.propietario}</p>}
                {local.rif && <p><span className="text-slate-500">RIF:</span> {local.rif}</p>}
                <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/50 truncate" title={`${local.direccion || 'Sin dirección exacta'} — ${local.calle.nombre}`}>
                  📍 {local.direccion ? `${local.direccion}, ` : ''}{local.calle.nombre}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ DEMOGRAFÍA TAB ============

function DemografiaTab({
  data, filtroGrupo, setFiltroGrupo, filtroLabel, listData, loadingList, colors, chartOpts,
}: {
  data: DemografiaResponse;
  filtroGrupo: 'TODOS' | 'NINOS' | 'ADOL' | 'ADULT' | 'ABUELOS';
  setFiltroGrupo: (v: 'TODOS' | 'NINOS' | 'ADOL' | 'ADULT' | 'ABUELOS') => void;
  filtroLabel: string; listData: any[]; loadingList: boolean;
  colors: string[]; chartOpts: any;
}) {
  const { global, porComunidad, porCalle, piramide } = data;

  const piramideLabels = Object.keys(piramide);
  const piramideHombres = piramideLabels.map(k => -piramide[k].hombres);
  const piramideMujeres = piramideLabels.map(k => piramide[k].mujeres);
  const maxVal = Math.max(...piramideLabels.map(k => Math.max(piramide[k].hombres, piramide[k].mujeres)), 1);

  const piramideData = {
    labels: piramideLabels,
    datasets: [
      { label: 'Hombres', data: piramideHombres, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1, borderRadius: 4 },
      { label: 'Mujeres', data: piramideMujeres, backgroundColor: 'rgba(236, 72, 153, 0.7)', borderColor: 'rgb(236, 72, 153)', borderWidth: 1, borderRadius: 4 },
    ],
  };

  const piramideOpts = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: '#64748b', callback: (value: any) => Math.abs(value) }, grid: { color: 'rgba(51, 65, 85, 0.3)' }, min: -maxVal - 1, max: maxVal + 1 },
      y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
    },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${Math.abs(ctx.raw)}` } },
    },
  };

  const segmentacionData = {
    labels: ['Niños (<12)', 'Niñas (<12)', 'Adolescentes M', 'Adolescentes F', 'Adultos M', 'Adultas F', 'Abuelos (≥60)', 'Abuelas (≥60)'],
    datasets: [{
      data: [global.ninos, global.ninas, global.adolescentesM, global.adolescentesF, global.adultosM, global.adultosF, global.abuelosHombres, global.abuelasMujeres],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(196, 181, 253, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(20, 184, 166, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(249, 115, 22, 0.7)'],
      borderWidth: 2,
      borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)', 'rgb(99, 102, 241)', 'rgb(196, 181, 253)', 'rgb(34, 197, 94)', 'rgb(20, 184, 166)', 'rgb(234, 179, 8)', 'rgb(249, 115, 22)'],
    }],
  };

  const dChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' }, boxWidth: 12 }, position: 'right' as const } },
  };

  const totalNinosNinas = global.ninos + global.ninas;
  const totalAdolescentes = global.adolescentesM + global.adolescentesF;
  const totalAdultos = global.adultosM + global.adultosF;
  const totalTerceraEdad = global.abuelosHombres + global.abuelasMujeres;

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div onClick={() => setFiltroGrupo(filtroGrupo === 'NINOS' ? 'TODOS' : 'NINOS')}
          className={`glass-card p-4 text-center border-l-4 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${filtroGrupo === 'NINOS' ? 'border-l-blue-500 bg-blue-500/10' : 'border-l-blue-500/30'}`}>
          <p className="text-2xl font-bold text-blue-400">{totalNinosNinas}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">👦👧 Niños y Niñas</p>
          <p className="text-[10px] text-slate-600">Menores de 12 años</p>
        </div>
        <div onClick={() => setFiltroGrupo(filtroGrupo === 'ADOL' ? 'TODOS' : 'ADOL')}
          className={`glass-card p-4 text-center border-l-4 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${filtroGrupo === 'ADOL' ? 'border-l-indigo-500 bg-indigo-500/10' : 'border-l-indigo-500/30'}`}>
          <p className="text-2xl font-bold text-indigo-400">{totalAdolescentes}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">🧑 Adolescentes</p>
          <p className="text-[10px] text-slate-600">12 a 17 años</p>
        </div>
        <div onClick={() => setFiltroGrupo(filtroGrupo === 'ADULT' ? 'TODOS' : 'ADULT')}
          className={`glass-card p-4 text-center border-l-4 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${filtroGrupo === 'ADULT' ? 'border-l-green-500 bg-green-500/10' : 'border-l-green-500/30'}`}>
          <p className="text-2xl font-bold text-green-400">{totalAdultos}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">🧑‍💼 Adultos</p>
          <p className="text-[10px] text-slate-600">18 a 59 años</p>
        </div>
        <div onClick={() => setFiltroGrupo(filtroGrupo === 'ABUELOS' ? 'TODOS' : 'ABUELOS')}
          className={`glass-card p-4 text-center border-l-4 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${filtroGrupo === 'ABUELOS' ? 'border-l-amber-500 bg-amber-500/10' : 'border-l-amber-500/30'}`}>
          <p className="text-2xl font-bold text-amber-400">{totalTerceraEdad}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">👴👵 Tercera Edad</p>
          <p className="text-[10px] text-slate-600">60 años o más</p>
        </div>
      </div>

      {/* Listado de personas (cuando se filtra por grupo) */}
      {filtroGrupo !== 'TODOS' && (
        <div className="glass-card p-5 animate-slide-up border-t-4 border-t-blue-500/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                {filtroGrupo === 'NINOS' && '👦👧 Listado de Niños y Niñas'}
                {filtroGrupo === 'ADOL' && '🧑 Listado de Adolescentes'}
                {filtroGrupo === 'ADULT' && '🧑‍💼 Listado de Adultos'}
                {filtroGrupo === 'ABUELOS' && '👴👵 Listado de Adultos Mayores'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Mostrando registros detallados — {filtroLabel}</p>
            </div>
            <button onClick={() => setFiltroGrupo('TODOS')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          {loadingList ? (
            <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : listData.length === 0 ? (
            <p className="text-center py-8 text-slate-500">No hay personas registradas en este grupo para la selección actual.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {listData.map((p: any) => (
                <div key={p.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.genero === 'M' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.cedula ? `${p.cedula} • ` : ''}{p.edad} años • {p.calle}</p>
                    </div>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detalle por género */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-blue-400">{global.ninos}</p><p className="text-xs text-slate-500">👦 Niños</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-pink-400">{global.ninas}</p><p className="text-xs text-slate-500">👧 Niñas</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-indigo-400">{global.adolescentesM + global.adolescentesF}</p><p className="text-xs text-slate-500">🧑 Adolescentes</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-green-400">{global.adultosM + global.adultosF}</p><p className="text-xs text-slate-500">🧑‍💼 Adultos</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-yellow-400">{global.abuelosHombres}</p><p className="text-xs text-slate-500">👴 Abuelos</p></div>
        <div className="glass-card p-3 text-center"><p className="text-xl font-bold text-orange-400">{global.abuelasMujeres}</p><p className="text-xs text-slate-500">👵 Abuelas</p></div>
      </div>

      {/* Gráficos: Pirámide + Segmentación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-blue-400" /> Pirámide Poblacional
          </h3>
          <div className="h-[420px]"><Bar data={piramideData} options={piramideOpts as any} /></div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-pink-400" /> Segmentación por Grupo
          </h3>
          <div className="h-[420px]"><Doughnut data={segmentacionData} options={dChartOpts as any} /></div>
        </div>
      </div>

      {/* Tabla por comunidad */}
      {porComunidad.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiMap className="w-4 h-4 text-purple-400" /> Demografía por Comunidad
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Comunidad</th>
                <th className="text-center py-3 px-2 text-blue-400 font-medium">👦 Niños</th>
                <th className="text-center py-3 px-2 text-pink-400 font-medium">👧 Niñas</th>
                <th className="text-center py-3 px-2 text-indigo-400 font-medium">Adolesc.</th>
                <th className="text-center py-3 px-2 text-green-400 font-medium">Adultos</th>
                <th className="text-center py-3 px-2 text-yellow-400 font-medium">👴 Abuelos</th>
                <th className="text-center py-3 px-2 text-orange-400 font-medium">👵 Abuelas</th>
                <th className="text-center py-3 px-2 text-white font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {porComunidad.map((item) => (
                <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-2 text-slate-300 font-medium">{item.nombre}</td>
                  <td className="py-2.5 px-2 text-center text-blue-300">{item.conteo.ninos}</td>
                  <td className="py-2.5 px-2 text-center text-pink-300">{item.conteo.ninas}</td>
                  <td className="py-2.5 px-2 text-center text-indigo-300">{item.conteo.adolescentesM + item.conteo.adolescentesF}</td>
                  <td className="py-2.5 px-2 text-center text-green-300">{item.conteo.adultosM + item.conteo.adultosF}</td>
                  <td className="py-2.5 px-2 text-center text-yellow-300">{item.conteo.abuelosHombres}</td>
                  <td className="py-2.5 px-2 text-center text-orange-300">{item.conteo.abuelasMujeres}</td>
                  <td className="py-2.5 px-2 text-center text-white font-semibold">{item.conteo.total}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-600 bg-slate-800/20">
                <td className="py-2.5 px-2 text-white font-bold">TOTAL</td>
                <td className="py-2.5 px-2 text-center text-blue-400 font-bold">{global.ninos}</td>
                <td className="py-2.5 px-2 text-center text-pink-400 font-bold">{global.ninas}</td>
                <td className="py-2.5 px-2 text-center text-indigo-400 font-bold">{global.adolescentesM + global.adolescentesF}</td>
                <td className="py-2.5 px-2 text-center text-green-400 font-bold">{global.adultosM + global.adultosF}</td>
                <td className="py-2.5 px-2 text-center text-yellow-400 font-bold">{global.abuelosHombres}</td>
                <td className="py-2.5 px-2 text-center text-orange-400 font-bold">{global.abuelasMujeres}</td>
                <td className="py-2.5 px-2 text-center text-white font-bold">{global.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla por calle */}
      {porCalle.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiMapPin className="w-4 h-4 text-cyan-400" /> Demografía por Calle
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Calle</th>
                <th className="text-left py-3 px-2 text-slate-500 font-medium hidden md:table-cell">Comunidad</th>
                <th className="text-center py-3 px-2 text-blue-400 font-medium">👦</th>
                <th className="text-center py-3 px-2 text-pink-400 font-medium">👧</th>
                <th className="text-center py-3 px-2 text-indigo-400 font-medium">Adolesc.</th>
                <th className="text-center py-3 px-2 text-green-400 font-medium">Adultos</th>
                <th className="text-center py-3 px-2 text-yellow-400 font-medium">👴</th>
                <th className="text-center py-3 px-2 text-orange-400 font-medium">👵</th>
                <th className="text-center py-3 px-2 text-white font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {porCalle.map((item) => (
                <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-2 text-slate-300 font-medium">{item.nombre}</td>
                  <td className="py-2 px-2 text-slate-500 hidden md:table-cell">{item.comunidadNombre}</td>
                  <td className="py-2 px-2 text-center text-blue-300">{item.conteo.ninos}</td>
                  <td className="py-2 px-2 text-center text-pink-300">{item.conteo.ninas}</td>
                  <td className="py-2 px-2 text-center text-indigo-300">{item.conteo.adolescentesM + item.conteo.adolescentesF}</td>
                  <td className="py-2 px-2 text-center text-green-300">{item.conteo.adultosM + item.conteo.adultosF}</td>
                  <td className="py-2 px-2 text-center text-yellow-300">{item.conteo.abuelosHombres}</td>
                  <td className="py-2 px-2 text-center text-orange-300">{item.conteo.abuelasMujeres}</td>
                  <td className="py-2 px-2 text-center text-white font-semibold">{item.conteo.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ SALUD TAB ============

function SaludTab({
  reporte, colors, chartOpts, barOpts,
}: {
  reporte: SaludReporte; colors: string[]; chartOpts: any; barOpts: any;
}) {
  const hBarOpts = {
    ...chartOpts, indexAxis: 'y' as const,
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
      y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
    },
  };

  const enfermedadesBarData = {
    labels: reporte.enfermedadesTop.slice(0, 10).map(e => e.nombre),
    datasets: [{ label: 'Casos', data: reporte.enfermedadesTop.slice(0, 10).map(e => e.cantidad), backgroundColor: colors, borderRadius: 6 }],
  };

  const tipoEnfData = {
    labels: Object.keys(reporte.porTipoEnfermedad),
    datasets: [{ data: Object.values(reporte.porTipoEnfermedad), backgroundColor: colors.slice(0, Object.keys(reporte.porTipoEnfermedad).length), borderWidth: 2 }],
  };

  const severidadData = {
    labels: Object.keys(reporte.porSeveridad),
    datasets: [{ data: Object.values(reporte.porSeveridad), backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(107, 114, 128, 0.4)'], borderWidth: 2 }],
  };

  const medicamentosBarData = {
    labels: reporte.medicamentosDemanda.slice(0, 10).map(m => m.nombre),
    datasets: [{ label: 'Pacientes', data: reporte.medicamentosDemanda.slice(0, 10).map(m => m.pacientes), backgroundColor: 'rgba(59, 130, 246, 0.7)', borderRadius: 6 }],
  };

  const demandaMeds = Object.keys(reporte.demandaCruzada);
  const demandaComs = new Set<string>();
  for (const med of demandaMeds) {
    for (const com of Object.keys(reporte.demandaCruzada[med])) {
      demandaComs.add(com);
    }
  }
  const demandaComsArr = Array.from(demandaComs);

  return (
    <div className="space-y-6">
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


      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4 text-red-400" /> Top Enfermedades
          </h3>
          <div className="h-80">
            {reporte.enfermedadesTop.length > 0 ? <Bar data={enfermedadesBarData} options={hBarOpts as any} /> : <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos registrados</div>}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiPackage className="w-4 h-4 text-blue-400" /> Demanda de Medicamentos
          </h3>
          <div className="h-80">
            {reporte.medicamentosDemanda.length > 0 ? <Bar data={medicamentosBarData} options={hBarOpts as any} /> : <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos registrados</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Tipo de Enfermedad</h3>
          <div className="h-64">{Object.keys(reporte.porTipoEnfermedad).length > 0 ? <Doughnut data={tipoEnfData} options={chartOpts} /> : <div className="flex items-center justify-center h-full text-slate-500 text-sm">Sin datos</div>}</div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Severidad</h3>
          <div className="h-64"><Doughnut data={severidadData} options={chartOpts} /></div>
        </div>
      </div>

      {/* Demanda Cruzada */}
      {demandaMeds.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-purple-400" /> 📊 Demanda de Medicamentos por Comunidad (BI)
          </h3>
          <p className="text-xs text-slate-500 mb-3">Cantidad de pacientes y unidades/mes estimadas de cada medicamento por comunidad</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-medium">Medicamento</th>
                {demandaComsArr.map(com => <th key={com} className="text-center py-3 px-2 text-slate-400 font-medium">{com}</th>)}
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
                              {cell.cantidadMes > 0 && <span className="text-slate-500 text-xs ml-1">({cell.cantidadMes}/mes)</span>}
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
    </div>
  );
}
