// =============================================================
// Reportes Estadísticos (Expandidos)
// Gráficos y datos detallados del censo con servicios y programas
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Bar, Pie } from 'react-chartjs-2';
import { FiBarChart2, FiFilter, FiDroplet, FiZap, FiWifi } from 'react-icons/fi';

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
  edadesPorRango: Record<string, number>;
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

export default function ReportesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/comunidades').then((r) => r.json()).then(setComunidades).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = filtro ? `/api/estadisticas?comunidadId=${filtro}` : '/api/estadisticas';
    fetch(url)
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filtro]);

  if (loading || !stats) {
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

  const edadData = {
    labels: Object.keys(stats.edadesPorRango),
    datasets: [{
      label: 'Personas', data: Object.values(stats.edadesPorRango),
      backgroundColor: colors, borderRadius: 8,
    }],
  };

  const generoData = {
    labels: ['Hombres', 'Mujeres'],
    datasets: [{
      data: [stats.totalHombres, stats.totalMujeres],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)'],
      borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)'], borderWidth: 2,
    }],
  };

  const edadGrupoData = {
    labels: ['Mayores de Edad', 'Menores de Edad'],
    datasets: [{
      data: [stats.totalMayores, stats.totalMenores],
      backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(14, 165, 233, 0.7)'],
      borderColor: ['rgb(34, 197, 94)', 'rgb(14, 165, 233)'], borderWidth: 2,
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Reportes Estadísticos</h2>
          <p className="text-slate-500 mt-1">Análisis detallado del censo comunal</p>
        </div>
        <div className="flex items-center gap-2">
          <FiFilter className="w-4 h-4 text-slate-500" />
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="select-field max-w-xs">
            <option value="">Todas las comunidades</option>
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumen en números */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.totalMiembros}</p>
          <p className="text-xs text-slate-500 mt-1">Población Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.totalFamilias}</p>
          <p className="text-xs text-slate-500 mt-1">Familias</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.totalMayores}</p>
          <p className="text-xs text-slate-500 mt-1">Mayores de Edad</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{stats.totalPensionados}</p>
          <p className="text-xs text-slate-500 mt-1">Pensionados</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.totalDiscapacidad}</p>
          <p className="text-xs text-slate-500 mt-1">Con Discapacidad</p>
        </div>
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
          <h3 className="text-base font-semibold text-white mb-4">Distribución por Género</h3>
          <div className="h-64 md:h-72"><Doughnut data={generoData} options={chartOpts} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Mayores vs. Menores</h3>
          <div className="h-64 md:h-72"><Pie data={edadGrupoData} options={chartOpts} /></div>
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
      {viviendaData && (
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Tipos de Vivienda</h3>
          <div className="h-64 md:h-72"><Bar data={viviendaData} options={barOpts as any} /></div>
        </div>
      )}

      {/* Familias por comunidad */}
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-white mb-4">Familias por Comunidad</h3>
        <div className="h-80"><Bar data={comunidadData} options={barOpts as any} /></div>
      </div>
    </div>
  );
}
