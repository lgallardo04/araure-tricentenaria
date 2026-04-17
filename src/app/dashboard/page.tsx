// =============================================================
// Dashboard Principal - Admin y Jefe de Comunidad
// Muestra estadísticas expandidas del censo con demografía
// Filtros jerárquicos: Comunidad > Calle
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  FiUsers, FiHome, FiMapPin, FiMap, FiClipboard,
  FiBarChart2, FiSettings, FiArrowRight, FiDroplet, FiZap, FiFilter, FiActivity
} from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

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
  edadesPorRango: Record<string, number>;
  servicios: {
    agua: Record<string, number>;
    electricidad: Record<string, number>;
    gas: Record<string, number>;
    internet: Record<string, number>;
  };
  poblacionPorComunidad: { nombre: string; totalFamilias: number; totalCalles: number }[];
}

interface Comunidad { id: string; nombre: string; }
interface Calle { id: string; nombre: string; comunidadId: string; comunidad: { id: string; nombre: string }; }

export default function DashboardPage() {
  const { data: session } = useSession();
  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // Build stats URL with filters
  const statsParams = new URLSearchParams();
  if (filtroCalle) statsParams.set('calleId', filtroCalle);
  else if (filtroComunidad) statsParams.set('comunidadId', filtroComunidad);
  const statsKey = `/api/estadisticas${statsParams.toString() ? '?' + statsParams.toString() : ''}`;

  const { data: stats, error, isLoading, mutate } = useSWR<Stats>(statsKey);

  const role = session?.user?.role;
  const isAdmin = role === 'ADMIN';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">No se pudieron cargar las estadísticas.</p>
        <button type="button" onClick={() => mutate()} className="btn-primary px-4 py-2">
          Reintentar
        </button>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Población Total', value: stats.totalMiembros, icon: FiUsers, gradient: 'from-blue-500 to-blue-700' },
    { label: 'Familias', value: stats.totalFamilias, icon: FiHome, gradient: 'from-emerald-500 to-emerald-700' },
    { label: 'Comunidades', value: stats.totalComunidades, icon: FiMap, gradient: 'from-purple-500 to-purple-700' },
    { label: 'Calles', value: stats.totalCalles, icon: FiMapPin, gradient: 'from-cyan-500 to-cyan-700' },
    { label: 'Pensionados', value: stats.totalPensionados, icon: FiUsers, gradient: 'from-yellow-500 to-yellow-700' },
    { label: 'Discapacidad', value: stats.totalDiscapacidad, icon: FiUsers, gradient: 'from-red-500 to-red-700' },
    { label: 'Carnet Patria', value: stats.totalCarnetPatria, icon: FiClipboard, gradient: 'from-indigo-500 to-indigo-700' },
    { label: 'Reciben CLAP', value: stats.totalClap, icon: FiClipboard, gradient: 'from-teal-500 to-teal-700' },
  ];

  const generoData = {
    labels: ['Hombres', 'Mujeres'],
    datasets: [{
      data: [stats.totalHombres, stats.totalMujeres],
      backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)'],
      borderColor: ['rgb(59, 130, 246)', 'rgb(236, 72, 153)'],
      borderWidth: 2,
    }],
  };

  const edadData = {
    labels: Object.keys(stats.edadesPorRango),
    datasets: [{
      label: 'Personas',
      data: Object.values(stats.edadesPorRango),
      backgroundColor: [
        'rgba(99, 102, 241, 0.7)', 'rgba(59, 130, 246, 0.7)',
        'rgba(14, 165, 233, 0.7)', 'rgba(20, 184, 166, 0.7)',
        'rgba(34, 197, 94, 0.7)', 'rgba(234, 179, 8, 0.7)',
        'rgba(249, 115, 22, 0.7)',
      ],
      borderRadius: 8,
    }],
  };

  // Demografía detallada
  const demografiaData = {
    labels: ['Niños', 'Niñas', 'Adolescentes', 'Adultos', 'Abuelos', 'Abuelas'],
    datasets: [{
      data: [
        stats.totalNinos, stats.totalNinas, stats.totalAdolescentes,
        stats.totalAdultos, stats.totalAbuelosHombres, stats.totalAbuelasMujeres,
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)',  // Niños - azul
        'rgba(236, 72, 153, 0.7)',  // Niñas - rosa
        'rgba(99, 102, 241, 0.7)',  // Adolescentes - indigo
        'rgba(34, 197, 94, 0.7)',   // Adultos - verde
        'rgba(234, 179, 8, 0.7)',   // Abuelos - amarillo
        'rgba(249, 115, 22, 0.7)',  // Abuelas - naranja
      ],
      borderColor: [
        'rgb(59, 130, 246)', 'rgb(236, 72, 153)', 'rgb(99, 102, 241)',
        'rgb(34, 197, 94)', 'rgb(234, 179, 8)', 'rgb(249, 115, 22)',
      ],
      borderWidth: 2,
    }],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
  };

  const barOpts = {
    ...chartOpts,
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
    },
  };

  // Accesos rápidos
  const quickActions = isAdmin ? [
    { label: 'Gestionar Usuarios', href: '/dashboard/jefes-calle', icon: FiSettings, color: 'bg-purple-500/20 text-purple-400' },
    { label: 'Ver Comunidades', href: '/dashboard/comunidades', icon: FiMap, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Salud', href: '/dashboard/salud', icon: FiActivity, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Demografía', href: '/dashboard/demografia', icon: FiUsers, color: 'bg-pink-500/20 text-pink-400' },
    { label: 'Reportes', href: '/dashboard/reportes', icon: FiBarChart2, color: 'bg-cyan-500/20 text-cyan-400' },
  ] : [
    { label: 'Ver Calles', href: '/dashboard/calles', icon: FiMapPin, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Salud', href: '/dashboard/salud', icon: FiActivity, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Demografía', href: '/dashboard/demografia', icon: FiUsers, color: 'bg-pink-500/20 text-pink-400' },
    { label: 'Reportes', href: '/dashboard/reportes', icon: FiBarChart2, color: 'bg-cyan-500/20 text-cyan-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isAdmin ? 'Panel de Administración' : 'Mi Comunidad'}
          </h2>
          <p className="text-slate-500 mt-1">
            {isAdmin ? 'Visión general del censo comunal' : 'Estadísticas de tu comunidad'}
          </p>
        </div>

        {/* Filtros jerárquicos */}
        <div className="flex flex-wrap items-center gap-2">
          <FiFilter className="w-4 h-4 text-slate-500" />
          <select
            value={filtroComunidad}
            onChange={(e) => { setFiltroComunidad(e.target.value); setFiltroCalle(''); }}
            className="select-field max-w-[200px] text-sm"
          >
            <option value="">Todas las comunidades</option>
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

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-4 hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Demografía Detallada */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-blue-400">{stats.totalNinos}</p>
          <p className="text-xs text-slate-500 mt-1">👦 Niños</p>
          <p className="text-[10px] text-slate-600">&lt; 12 años</p>
        </div>
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-pink-400">{stats.totalNinas}</p>
          <p className="text-xs text-slate-500 mt-1">👧 Niñas</p>
          <p className="text-[10px] text-slate-600">&lt; 12 años</p>
        </div>
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-indigo-400">{stats.totalAdolescentes}</p>
          <p className="text-xs text-slate-500 mt-1">🧑 Adolescentes</p>
          <p className="text-[10px] text-slate-600">12–17 años</p>
        </div>
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-green-400">{stats.totalAdultos}</p>
          <p className="text-xs text-slate-500 mt-1">🧑‍💼 Adultos</p>
          <p className="text-[10px] text-slate-600">18–59 años</p>
        </div>
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-yellow-400">{stats.totalAbuelosHombres}</p>
          <p className="text-xs text-slate-500 mt-1">👴 Abuelos</p>
          <p className="text-[10px] text-slate-600">≥ 60 años</p>
        </div>
        <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
          <p className="text-xl font-bold text-orange-400">{stats.totalAbuelasMujeres}</p>
          <p className="text-xs text-slate-500 mt-1">👵 Abuelas</p>
          <p className="text-[10px] text-slate-600">≥ 60 años</p>
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-blue-400" />
            Distribución por Edad
          </h3>
          <div className="h-64 md:h-72">
            <Bar data={edadData} options={barOpts as any} />
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4">Segmentación Demográfica</h3>
          <div className="h-64 md:h-72">
            <Doughnut data={demografiaData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* Info especial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-xl font-bold text-pink-400">{stats.totalEmbarazadas}</p>
          <p className="text-xs text-slate-500 mt-1">Embarazadas</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl font-bold text-pink-300">{stats.totalLactancia}</p>
          <p className="text-xs text-slate-500 mt-1">En Lactancia</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl font-bold text-amber-400">{stats.totalTerceraEdad}</p>
          <p className="text-xs text-slate-500 mt-1">Tercera Edad (≥60)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xl font-bold text-cyan-400">{stats.totalMenores}</p>
          <p className="text-xs text-slate-500 mt-1">Menores de 18</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="glass-card p-5">
        <h3 className="text-base font-semibold text-white mb-3">Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all group">
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-300 truncate">{action.label}</p>
              </div>
              <FiArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
