// =============================================================
// Demografía - Análisis Poblacional Detallado
// Pirámide poblacional, segmentación por edad/género
// Filtros jerárquicos: Comuna > Comunidad > Calle
// Filtro de rango de edad personalizable
// Tabla de personas con cédula (o cédula parental para menores)
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { FiUsers, FiFilter, FiMapPin, FiMap, FiBarChart2, FiX, FiSearch, FiUser } from 'react-icons/fi';

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

interface PersonaListItem {
  id: string;
  nombre: string;
  cedula: string | null;
  cedulaParental: string | null;
  esMenor: boolean;
  edad: number;
  genero: string;
  parentesco: string | null;
  esJefe: boolean;
  calle: string;
  comunidad: string;
}

interface Comunidad { id: string; nombre: string; }
interface Calle { id: string; nombre: string; comunidadId: string; comunidad: { id: string; nombre: string }; }

// Grupos etarios predefinidos para acceso rápido
const GRUPOS_RAPIDOS = [
  { label: '👶 Bebés (0-1)', min: 0, max: 1 },
  { label: '👦👧 Niños (0-11)', min: 0, max: 11 },
  { label: '🧑 Adolescentes (12-17)', min: 12, max: 17 },
  { label: '🧑‍💼 Adultos (18-59)', min: 18, max: 59 },
  { label: '👴👵 Tercera Edad (60+)', min: 60, max: 120 },
  { label: '🗳️ Votantes (18+)', min: 18, max: 120 },
];

export default function DemografiaPage() {
  const [filtroComunidad, setFiltroComunidad] = useState('');
  const [filtroCalle, setFiltroCalle] = useState('');
  const [edadMin, setEdadMin] = useState('');
  const [edadMax, setEdadMax] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);
  const [grupoPredefinido, setGrupoPredefinido] = useState<string | null>(null);

  const { data: comunidades = [] } = useSWR<Comunidad[]>('/api/comunidades');
  const callesUrl = filtroComunidad ? `/api/calles?comunidadId=${filtroComunidad}` : null;
  const { data: calles = [] } = useSWR<Calle[]>(callesUrl);

  // Build demographics URL with hierarchy
  const params = new URLSearchParams();
  if (filtroCalle) params.set('calleId', filtroCalle);
  else if (filtroComunidad) params.set('comunidadId', filtroComunidad);
  const apiUrl = `/api/demografia${params.toString() ? '?' + params.toString() : ''}`;

  const { data, error, isLoading, mutate } = useSWR<DemografiaResponse>(apiUrl);

  // Build list URL
  const listParams = new URLSearchParams();
  if (filtroCalle) listParams.set('calleId', filtroCalle);
  else if (filtroComunidad) listParams.set('comunidadId', filtroComunidad);
  listParams.set('list', 'true');
  if (edadMin !== '') listParams.set('edadMin', edadMin);
  if (edadMax !== '') listParams.set('edadMax', edadMax);
  const listUrl = mostrarLista ? `/api/demografia?${listParams.toString()}` : null;
  const { data: listData = [], isLoading: loadingList } = useSWR<PersonaListItem[]>(listUrl);

  const aplicarRango = () => {
    setMostrarLista(true);
    setGrupoPredefinido(null);
  };

  const aplicarGrupo = (grupo: typeof GRUPOS_RAPIDOS[0]) => {
    setEdadMin(String(grupo.min));
    setEdadMax(String(grupo.max));
    setGrupoPredefinido(grupo.label);
    setMostrarLista(true);
  };

  const limpiarFiltro = () => {
    setEdadMin('');
    setEdadMax('');
    setMostrarLista(false);
    setGrupoPredefinido(null);
  };

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
  const piramideHombres = piramideLabels.map(k => -piramide[k].hombres);
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

  const rangoLabel = edadMin !== '' || edadMax !== ''
    ? grupoPredefinido
      ? grupoPredefinido
      : `${edadMin !== '' ? edadMin : '0'} a ${edadMax !== '' ? edadMax : '∞'} años`
    : '';

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

      {/* ============================================================= */}
      {/* Panel de Filtro de Rango de Edad                              */}
      {/* ============================================================= */}
      <div className="glass-card p-5 border border-indigo-500/20 bg-indigo-900/10">
        <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
          <FiSearch className="w-4 h-4" />
          Filtrar personas por rango de edad
        </h3>

        {/* Grupos rápidos */}
        <div className="flex flex-wrap gap-2 mb-4">
          {GRUPOS_RAPIDOS.map((g) => (
            <button
              key={g.label}
              onClick={() => aplicarGrupo(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                grupoPredefinido === g.label
                  ? 'bg-indigo-500 text-white border-indigo-400'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Rango personalizado */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Edad mínima</label>
            <input
              type="number"
              min="0"
              max="120"
              value={edadMin}
              onChange={(e) => { setEdadMin(e.target.value); setGrupoPredefinido(null); }}
              placeholder="0"
              className="input-field w-24 text-sm"
            />
          </div>
          <span className="text-slate-500 text-sm mb-2">—</span>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Edad máxima</label>
            <input
              type="number"
              min="0"
              max="120"
              value={edadMax}
              onChange={(e) => { setEdadMax(e.target.value); setGrupoPredefinido(null); }}
              placeholder="120"
              className="input-field w-24 text-sm"
            />
          </div>
          <button
            onClick={aplicarRango}
            disabled={edadMin === '' && edadMax === ''}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FiSearch className="w-4 h-4" />
            Buscar
          </button>
          {mostrarLista && (
            <button
              onClick={limpiarFiltro}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700/50 transition-colors flex items-center gap-1.5"
            >
              <FiX className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* Lista de personas filtradas por rango de edad                 */}
      {/* ============================================================= */}
      {mostrarLista && (
        <div className="glass-card p-0 overflow-hidden border-t-4 border-t-indigo-500/60 animate-fade-in">
          <div className="p-5 border-b border-slate-800/70 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiUser className="w-5 h-5 text-indigo-400" />
                Listado de personas — <span className="text-indigo-400">{rangoLabel}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {loadingList ? 'Cargando...' : `${listData.length} persona${listData.length !== 1 ? 's' : ''} encontrada${listData.length !== 1 ? 's' : ''}`} — {filtroLabel}
              </p>
            </div>
            <button
              onClick={limpiarFiltro}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {loadingList ? (
            <div className="flex justify-center p-10">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : listData.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                <FiUsers className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">No se encontraron personas en este rango</p>
              <p className="text-slate-600 text-sm mt-1">Intenta con un rango de edad diferente o amplía el área geográfica.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/50 border-b border-slate-700">
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400">#</th>
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400">Nombre Completo</th>
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400">Cédula</th>
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400 text-center">Edad</th>
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400 hidden md:table-cell">Calle</th>
                    <th className="p-4 text-xs font-semibold uppercase text-slate-400 hidden lg:table-cell">Comunidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {listData.map((p, i) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 text-xs text-slate-600 w-10">{i + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            p.genero === 'M'
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-pink-500/15 text-pink-400'
                          }`}>
                            {p.genero === 'M' ? '♂' : '♀'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{p.nombre}</p>
                            {p.parentesco && (
                              <p className="text-[10px] text-slate-500">{p.parentesco}{p.esJefe ? ' · Jefe de Familia' : ''}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {p.esMenor ? (
                          <div>
                            <p className="text-xs text-slate-500 leading-tight">Cédula parental:</p>
                            <span className="text-sm font-medium text-amber-400">
                              {p.cedulaParental ?? <span className="text-slate-600 italic">Sin registro</span>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-300">
                            {p.cedula ?? <span className="text-slate-600 italic">—</span>}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          p.edad < 12
                            ? 'bg-blue-500/15 text-blue-400'
                            : p.edad < 18
                            ? 'bg-indigo-500/15 text-indigo-400'
                            : p.edad < 60
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {p.edad} años
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-400 hidden md:table-cell">{p.calle}</td>
                      <td className="p-4 text-sm text-slate-500 hidden lg:table-cell">{p.comunidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Indicadores principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => aplicarGrupo(GRUPOS_RAPIDOS[1])}
          className="glass-card p-4 text-center border-l-4 border-l-blue-500/40 transition-all cursor-pointer hover:scale-[1.02] hover:border-l-blue-500 active:scale-[0.98]"
          title="Ver listado de niños y niñas"
        >
          <p className="text-2xl font-bold text-blue-400">{totalNinosNinas}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">👦👧 Niños y Niñas</p>
          <p className="text-[10px] text-slate-600">Menores de 12 años</p>
        </div>

        <div
          onClick={() => aplicarGrupo(GRUPOS_RAPIDOS[2])}
          className="glass-card p-4 text-center border-l-4 border-l-indigo-500/40 transition-all cursor-pointer hover:scale-[1.02] hover:border-l-indigo-500 active:scale-[0.98]"
          title="Ver listado de adolescentes"
        >
          <p className="text-2xl font-bold text-indigo-400">{totalAdolescentes}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">🧑 Adolescentes</p>
          <p className="text-[10px] text-slate-600">12 a 17 años</p>
        </div>
        <div
          onClick={() => aplicarGrupo(GRUPOS_RAPIDOS[3])}
          className="glass-card p-4 text-center border-l-4 border-l-green-500/40 transition-all cursor-pointer hover:scale-[1.02] hover:border-l-green-500 active:scale-[0.98]"
          title="Ver listado de adultos"
        >
          <p className="text-2xl font-bold text-green-400">{totalAdultos}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">🧑‍💼 Adultos</p>
          <p className="text-[10px] text-slate-600">18 a 59 años</p>
        </div>
        <div
          onClick={() => aplicarGrupo(GRUPOS_RAPIDOS[4])}
          className="glass-card p-4 text-center border-l-4 border-l-amber-500/40 transition-all cursor-pointer hover:scale-[1.02] hover:border-l-amber-500 active:scale-[0.98]"
          title="Ver listado de tercera edad"
        >
          <p className="text-2xl font-bold text-amber-400">{totalTerceraEdad}</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider">👴👵 Tercera Edad</p>
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
