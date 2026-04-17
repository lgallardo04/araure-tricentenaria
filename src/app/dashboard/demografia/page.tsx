// =============================================================
// Demografía - Análisis Poblacional Detallado
// Pirámide poblacional, segmentación por edad/género
// Filtros jerárquicos: Comuna > Comunidad > Calle
// Tablas comparativas por comunidad y calle
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FiUsers, FiFilter, FiMapPin, FiMap, FiBarChart2 } from 'react-icons/fi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

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

interface Comunidad { id: string; nombre: string; }
interface Calle { id: string; nombre: string; comunidadId: string; comunidad: { id: string; nombre: string }; }

export default function DemografiaPage() {
  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // Build demographics URL with hierarchy
  const params = new URLSearchParams();
  if (filtroCalle) params.set('calleId', filtroCalle);
  else if (filtroComunidad) params.set('comunidadId', filtroComunidad);
  const apiUrl = `/api/demografia${params.toString() ? '?' + params.toString() : ''}`;

  const { data, error, isLoading, mutate } = useSWR<DemografiaResponse>(apiUrl);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-400 text-sm">No se pudieron cargar los datos demográficos.</p>
        <button type="button" onClick={() => mutate()} className="btn-primary px-4 py-2">Reintentar</button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando demografía...</p>
        </div>
      </div>
    );
  }

  const { global, porComunidad, porCalle, piramide } = data;

  // Filtro label
  const filtroLabel = filtroCalle
    ? calles.find(c => c.id === filtroCalle)?.nombre || 'Calle'
    : filtroComunidad
    ? comunidades.find(c => c.id === filtroComunidad)?.nombre?.replace('Consejo Comunal ', '') || 'Comunidad'
    : 'Toda la Comuna';

  // === Pirámide Poblacional ===
  const piramideLabels = Object.keys(piramide);
  const piramideHombres = piramideLabels.map(k => -piramide[k].hombres); // negativo para lado izquierdo
  const piramideMujeres = piramideLabels.map(k => piramide[k].mujeres);
  const maxVal = Math.max(
    ...piramideLabels.map(k => Math.max(piramide[k].hombres, piramide[k].mujeres)),
    1
  );

  const piramideData = {
    labels: piramideLabels,
    datasets: [
      {
        label: 'Hombres',
        data: piramideHombres,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Mujeres',
        data: piramideMujeres,
        backgroundColor: 'rgba(236, 72, 153, 0.7)',
        borderColor: 'rgb(236, 72, 153)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const piramideOpts = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          color: '#64748b',
          callback: (value: any) => Math.abs(value),
        },
        grid: { color: 'rgba(51, 65, 85, 0.3)' },
        min: -maxVal - 1,
        max: maxVal + 1,
      },
      y: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${Math.abs(ctx.raw)}`,
        },
      },
    },
  };

  // === Segmentación Doughnut ===
  const segmentacionData = {
    labels: ['Niños (<12)', 'Niñas (<12)', 'Adolescentes M', 'Adolescentes F', 'Adultos M', 'Adultas F', 'Abuelos (≥60)', 'Abuelas (≥60)'],
    datasets: [{
      data: [
        global.ninos, global.ninas,
        global.adolescentesM, global.adolescentesF,
        global.adultosM, global.adultosF,
        global.abuelosHombres, global.abuelasMujeres,
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)',
        'rgba(99, 102, 241, 0.7)', 'rgba(196, 181, 253, 0.7)',
        'rgba(34, 197, 94, 0.7)', 'rgba(20, 184, 166, 0.7)',
        'rgba(234, 179, 8, 0.7)', 'rgba(249, 115, 22, 0.7)',
      ],
      borderWidth: 2,
      borderColor: [
        'rgb(59, 130, 246)', 'rgb(236, 72, 153)',
        'rgb(99, 102, 241)', 'rgb(196, 181, 253)',
        'rgb(34, 197, 94)', 'rgb(20, 184, 166)',
        'rgb(234, 179, 8)', 'rgb(249, 115, 22)',
      ],
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' }, boxWidth: 12 }, position: 'right' as const } },
  };

  // Calcular totales para la tabla
  const totalNinosNinas = global.ninos + global.ninas;
  const totalAdolescentes = global.adolescentesM + global.adolescentesF;
  const totalAdultos = global.adultosM + global.adultosF;
  const totalTerceraEdad = global.abuelosHombres + global.abuelasMujeres;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiUsers className="w-6 h-6 text-blue-400" />
            Demografía Poblacional
          </h2>
          <p className="text-slate-500 mt-1">
            Análisis detallado por grupo etario y género — <span className="text-blue-400">{filtroLabel}</span>
          </p>
        </div>

        {/* Filtros cascada */}
        <div className="flex flex-wrap items-center gap-2">
          <FiFilter className="w-4 h-4 text-slate-500" />
          <select
            id="filtro-comunidad"
            value={filtroComunidad}
            onChange={(e) => { setFiltroComunidad(e.target.value); setFiltroCalle(''); }}
            className="select-field max-w-[200px] text-sm"
          >
            <option value="">Toda la Comuna</option>
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre.replace('Consejo Comunal ', '')}</option>
            ))}
          </select>
          {filtroComunidad && (
            <select
              id="filtro-calle"
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

      {/* Indicadores principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center border-l-4 border-l-blue-500">
          <p className="text-2xl font-bold text-blue-400">{totalNinosNinas}</p>
          <p className="text-xs text-slate-500 mt-1">👦👧 Niños y Niñas</p>
          <p className="text-[10px] text-slate-600">Menores de 12 años</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-indigo-500">
          <p className="text-2xl font-bold text-indigo-400">{totalAdolescentes}</p>
          <p className="text-xs text-slate-500 mt-1">🧑 Adolescentes</p>
          <p className="text-[10px] text-slate-600">12 a 17 años</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-green-500">
          <p className="text-2xl font-bold text-green-400">{totalAdultos}</p>
          <p className="text-xs text-slate-500 mt-1">🧑‍💼 Adultos</p>
          <p className="text-[10px] text-slate-600">18 a 59 años</p>
        </div>
        <div className="glass-card p-4 text-center border-l-4 border-l-amber-500">
          <p className="text-2xl font-bold text-amber-400">{totalTerceraEdad}</p>
          <p className="text-xs text-slate-500 mt-1">👴👵 Tercera Edad</p>
          <p className="text-[10px] text-slate-600">60 años o más</p>
        </div>
      </div>

      {/* Detalle por género */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-blue-400">{global.ninos}</p>
          <p className="text-xs text-slate-500">👦 Niños</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-pink-400">{global.ninas}</p>
          <p className="text-xs text-slate-500">👧 Niñas</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-indigo-400">{global.adolescentesM + global.adolescentesF}</p>
          <p className="text-xs text-slate-500">🧑 Adolescentes</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-green-400">{global.adultosM + global.adultosF}</p>
          <p className="text-xs text-slate-500">🧑‍💼 Adultos</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-yellow-400">{global.abuelosHombres}</p>
          <p className="text-xs text-slate-500">👴 Abuelos</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xl font-bold text-orange-400">{global.abuelasMujeres}</p>
          <p className="text-xs text-slate-500">👵 Abuelas</p>
        </div>
      </div>

      {/* Gráficos: Pirámide + Segmentación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4 text-blue-400" />
            Pirámide Poblacional
          </h3>
          <div className="h-[420px]">
            <Bar data={piramideData} options={piramideOpts as any} />
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiUsers className="w-4 h-4 text-pink-400" />
            Segmentación por Grupo
          </h3>
          <div className="h-[420px]">
            <Doughnut data={segmentacionData} options={chartOpts as any} />
          </div>
        </div>
      </div>

      {/* Tabla comparativa por comunidad */}
      {porComunidad.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiMap className="w-4 h-4 text-purple-400" />
            Demografía por Comunidad
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
              {/* Totales */}
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

      {/* Tabla comparativa por calle */}
      {porCalle.length > 0 && (
        <div className="glass-card p-5 overflow-x-auto">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FiMapPin className="w-4 h-4 text-cyan-400" />
            Demografía por Calle
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
