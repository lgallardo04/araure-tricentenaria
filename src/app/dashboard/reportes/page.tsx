// =============================================================
// Reportes Estadísticos (Expandidos y con Exportación)
// Gráficos y datos detallados del censo con servicios y programas
// Filtros jerárquicos: Comunidad > Calle
// RBAC: Roles de Administrador (Exportación PDF global) y Jefe de Comunidad
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { FiBarChart2, FiFilter, FiDroplet, FiZap, FiDownload, FiBriefcase } from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

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
  // Demografía detallada
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

interface Comunidad { id: string; nombre: string; }
interface Calle { id: string; nombre: string; comunidadId: string; comunidad: { id: string; nombre: string }; }

export default function ReportesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';

  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');
  const [filtroDato, setFiltroDato] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // Build stats URL with hierarchy
  const statsParams = new URLSearchParams();
  if (filtroCalle) statsParams.set('calleId', filtroCalle);
  else if (filtroComunidad) statsParams.set('comunidadId', filtroComunidad);
  if (filtroDato) statsParams.set('filtroDato', filtroDato);
  const statsKey = `/api/estadisticas${statsParams.toString() ? '?' + statsParams.toString() : ''}`;
  const { data: stats, error, isLoading, mutate } = useSWR<Stats>(statsKey);

  const localesParams = new URLSearchParams();
  if (filtroCalle) localesParams.set('calleId', filtroCalle);
  else if (filtroComunidad) localesParams.set('comunidadId', filtroComunidad);
  const localesKey = `/api/locales-comerciales${localesParams.toString() ? '?' + localesParams.toString() : ''}`;
  const { data: locales = [] } = useSWR<any[]>(localesKey);

  const exportPDF = async () => {
    try {
      setIsExporting(true);
      toast.loading('Generando PDF, por favor espera... (esto puede tardar unos segundos)', { id: 'pdf' });
      
      const element = document.getElementById('reporte-container');
      if (!element) return;
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' }); // Color slate-900
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Creamos una página adaptada al tamaño del reporte para que no lo corte
      const pdfVariable = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdfVariable.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdfVariable.save(`Reporte_Estadistico_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Reporte exportado exitosamente', { id: 'pdf' });
    } catch (error) {
      console.error('Generación de PDF errónea:', error);
      toast.error('Ocurrió un error al intentar exportar el PDF', { id: 'pdf' });
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">No se pudieron cargar los reportes.</p>
        <button type="button" onClick={() => mutate()} className="btn-primary px-4 py-2">
          Reintentar
        </button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const colors = [
    'rgba(99, 102, 241, 0.7)', 'rgba(59, 130, 246, 0.7)',
    'rgba(14, 165, 233, 0.7)', 'rgba(20, 184, 166, 0.7)',
    'rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)',
    'rgba(249, 115, 22, 0.7)', 'rgba(236, 72, 153, 0.7)',
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

  const rangos = Object.keys(stats.edadesPorRangoGenero || {});
  const edadData = {
    labels: rangos,
    datasets: [
      {
        label: 'Hombres',
        data: rangos.map(r => stats.edadesPorRangoGenero[r].hombres),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 6,
      },
      {
        label: 'Mujeres',
        data: rangos.map(r => stats.edadesPorRangoGenero[r].mujeres),
        backgroundColor: 'rgba(236, 72, 153, 0.7)',
        borderRadius: 6,
      }
    ],
  };

  const generoData = {
    labels: ['Hombres', 'Mujeres'],
    datasets: [{
      data: [stats.totalHombres, stats.totalMujeres],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)'],
      borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)'], borderWidth: 2,
    }],
  };

  const demografiaData = {
    labels: ['Niños (<12)', 'Niñas (<12)', 'Adolescentes (12-17)', 'Adultos (18-59)', 'Abuelos (≥60)', 'Abuelas (≥60)'],
    datasets: [{
      data: [
        stats.totalNinos, stats.totalNinas, stats.totalAdolescentes,
        stats.totalAdultos, stats.totalAbuelosHombres, stats.totalAbuelasMujeres,
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)',
        'rgba(99, 102, 241, 0.7)', 'rgba(34, 197, 94, 0.7)',
        'rgba(234, 179, 8, 0.7)', 'rgba(249, 115, 22, 0.7)',
      ],
      borderColor: [
        'rgb(59, 130, 246)', 'rgb(236, 72, 153)',
        'rgb(99, 102, 241)', 'rgb(34, 197, 94)',
        'rgb(234, 179, 8)', 'rgb(249, 115, 22)',
      ],
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
    datasets: [{
      label: 'Familias', data: stats.poblacionPorComunidad.map(c => c.totalFamilias),
      backgroundColor: colors, borderRadius: 8,
    }],
  };

  // Servicios - Agua
  const aguaData = {
    labels: ['Tubería', 'Cisterna', 'Pozo', 'No tiene'],
    datasets: [{
      data: [stats.servicios?.agua?.tuberia || 0, stats.servicios?.agua?.cisterna || 0, stats.servicios?.agua?.pozo || 0, stats.servicios?.agua?.noTiene || 0],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(14, 165, 233, 0.7)', 'rgba(20, 184, 166, 0.7)', 'rgba(107, 114, 128, 0.7)'],
      borderWidth: 2,
    }],
  };

  // Programas Sociales
  const programasData = {
    labels: ['Carnet de la Patria', 'Reciben CLAP', 'Sin programas'],
    datasets: [{
      data: [stats.totalCarnetPatria, stats.totalClap, Math.max(0, stats.totalFamilias - Math.max(stats.totalCarnetPatria, stats.totalClap))],
      backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(107, 114, 128, 0.4)'],
      borderWidth: 2,
    }],
  };

  // Vivienda
  const viviendaKeys = Object.keys(stats.tiposVivienda || {});
  const viviendaData = viviendaKeys.length > 0 ? {
    labels: viviendaKeys,
    datasets: [{
      data: Object.values(stats.tiposVivienda),
      backgroundColor: colors.slice(0, viviendaKeys.length), borderWidth: 2,
    }],
  } : null;

  // Filtro label
  const filtroLabel = filtroCalle
    ? calles.find(c => c.id === filtroCalle)?.nombre || 'Calle seleccionada'
    : filtroComunidad
    ? comunidades.find(c => c.id === filtroComunidad)?.nombre?.replace('Consejo Comunal ', '') || 'Comunidad'
    : 'Toda la Comuna';

  return (
    <div id="reporte-container" className="space-y-6 animate-fade-in pb-10 bg-slate-900 border-x border-t border-slate-900 px-2 pt-2 -mx-2 -mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reportes Estadísticos</h2>
          <p className="text-slate-500 mt-1">Análisis detallado del censo comunal — <span className="text-blue-400">{filtroLabel}</span></p>
        </div>

        {/* Filtros y Controles exportar */}
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
          
          <span className="text-slate-600 mx-1">|</span>

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

      {/* Recuadro Infocentro */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 rounded-xl p-4 mb-6 text-center shadow-lg animate-fade-in">
        <h3 className="text-lg md:text-xl font-bold text-blue-300 uppercase tracking-wider">
          El infocentro es el centro tecnológico de la comuna
        </h3>
      </div>

      {/* Estadísticas Electorales y Bebés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
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
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{stats.totalNinos}</p>
          <p className="text-xs text-slate-500">👦 Niños</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-pink-400">{stats.totalNinas}</p>
          <p className="text-xs text-slate-500">👧 Niñas</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-indigo-400">{stats.totalAdolescentes}</p>
          <p className="text-xs text-slate-500">🧑 Adolescentes</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-green-400">{stats.totalAdultos}</p>
          <p className="text-xs text-slate-500">🧑‍💼 Adultos</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-yellow-400">{stats.totalAbuelosHombres}</p>
          <p className="text-xs text-slate-500">👴 Abuelos</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-lg font-bold text-orange-400">{stats.totalAbuelasMujeres}</p>
          <p className="text-xs text-slate-500">👵 Abuelas</p>
        </div>
      </div>

      {/* Gráficos demográficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 break-inside-avoid">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 break-inside-avoid">
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
      <h3 className="text-lg font-semibold text-white pt-2 break-before-page">Servicios y Programas Sociales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 break-inside-avoid">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiDroplet className="w-4 h-4 text-cyan-400" /> Servicio de Agua
          </h3>
          <div className="h-64 md:h-72"><Doughnut data={aguaData} options={chartOpts} /></div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiZap className="w-4 h-4 text-yellow-400" /> Programas Sociales
          </h3>
          <div className="h-64 md:h-72"><Doughnut data={programasData} options={chartOpts} /></div>
        </div>
      </div>

      {/* Vivienda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 break-inside-avoid">
        {viviendaData && (
          <div className="glass-card p-5">
            <h3 className="text-base font-semibold text-white mb-4">Tipos de Vivienda</h3>
            <div className="h-64 md:h-72"><Bar data={viviendaData} options={barOpts as any} /></div>
          </div>
        )}

        {/* Familias por comunidad */}
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Familias por Comunidad</h3>
          <div className="h-64 md:h-72"><Bar data={comunidadData} options={barOpts as any} /></div>
        </div>
      </div>

      {/* Locales Comerciales */}
      <h3 className="text-lg font-semibold text-white pt-6 break-before-page flex items-center gap-2">
        <FiBriefcase className="text-yellow-500 w-5 h-5" /> Locales Comerciales Censados ({locales.length})
      </h3>
      
      {locales.length === 0 ? (
        <div className="glass-card p-6 text-center text-slate-500">
          <p>No hay locales comerciales censados en esta área.</p>
        </div>
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
