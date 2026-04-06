// =============================================================
// Gestión de Calles
// CRUD para calles con asignación de jefe y comunidad
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

interface Calle {
  id: string;
  nombre: string;
  avenida: string | null;
  puntoReferencia: string | null;
  comunidad: { id: string; nombre: string };
  jefeCalle: { id: string; name: string; email: string } | null;
  _count: { familias: number };
}

interface Comunidad { id: string; nombre: string; }
interface JefeCalle { id: string; name: string; email: string; }

export default function CallesPage() {
  const { data: calles = [], isLoading: loadingCalles, mutate: mutateCalles } = useSWR<Calle[]>('/api/calles');
  const { data: comunidades = [], isLoading: loadingComunidades } = useSWR<Comunidad[]>('/api/comunidades');
  const { data: jefes = [], isLoading: loadingJefes } = useSWR<JefeCalle[]>('/api/users?role=JEFE_CALLE');
  const loading = loadingCalles || loadingComunidades || loadingJefes;
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Calle | null>(null);
  const [form, setForm] = useState({
    nombre: '', avenida: '', puntoReferencia: '', comunidadId: '', jefeCalleId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form, jefeCalleId: form.jefeCalleId || null } : { ...form, jefeCalleId: form.jefeCalleId || null };
      const res = await apiFetch('/api/calles', {
        method,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editItem ? 'Calle actualizada' : 'Calle creada');
      setShowModal(false);
      setEditItem(null);
      mutateCalles();
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán todos los datos de censo asociados.`)) return;
    try {
      const res = await apiFetch(`/api/calles?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Calle eliminada');
      mutateCalles();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openEdit = (item: Calle) => {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      avenida: item.avenida || '',
      puntoReferencia: item.puntoReferencia || '',
      comunidadId: item.comunidad.id,
      jefeCalleId: item.jefeCalle?.id || '',
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Calles y Sectores</h2>
          <p className="text-slate-500 mt-1">Gestiona las calles de cada comunidad</p>
        </div>
        <button
          onClick={() => {
            setEditItem(null);
            setForm({ nombre: '', avenida: '', puntoReferencia: '', comunidadId: comunidades[0]?.id || '', jefeCalleId: '' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-5 h-5" />
          Nueva Calle
        </button>
      </div>

      {/* Tabla */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Calle</th>
                  <th>Avenida</th>
                  <th>Comunidad</th>
                  <th>Jefe de Calle</th>
                  <th>Familias</th>
                  <th>Referencia</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {calles.map((calle) => (
                  <tr key={calle.id}>
                    <td className="font-medium text-white">
                      <div className="flex items-center gap-2">
                        <FiMapPin className="w-4 h-4 text-blue-400" />
                        {calle.nombre}
                      </div>
                    </td>
                    <td>{calle.avenida || '—'}</td>
                    <td>
                      <span className="badge-blue">{calle.comunidad.nombre.replace('Consejo Comunal ', '')}</span>
                    </td>
                    <td>{calle.jefeCalle?.name || <span className="text-slate-600">Sin asignar</span>}</td>
                    <td>
                      <span className="badge-green">{calle._count.familias}</span>
                    </td>
                    <td className="text-slate-500 text-xs">{calle.puntoReferencia || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(calle)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(calle.id, calle.nombre)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editItem ? 'Editar Calle' : 'Nueva Calle'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Nombre de la Calle *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input-field" placeholder="Ej: Calle Principal" required />
              </div>
              <div>
                <label className="input-label">Avenida</label>
                <input value={form.avenida} onChange={(e) => setForm({ ...form, avenida: e.target.value })} className="input-field" placeholder="Av. Bolívar" />
              </div>
              <div>
                <label className="input-label">Punto de Referencia</label>
                <input value={form.puntoReferencia} onChange={(e) => setForm({ ...form, puntoReferencia: e.target.value })} className="input-field" placeholder="Cerca de la plaza" />
              </div>
              <div>
                <label className="input-label">Comunidad *</label>
                <select value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })} className="select-field" required>
                  <option value="">Seleccionar comunidad</option>
                  {comunidades.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Jefe de Calle</label>
                <select value={form.jefeCalleId} onChange={(e) => setForm({ ...form, jefeCalleId: e.target.value })} className="select-field">
                  <option value="">Sin asignar</option>
                  {jefes.map((j) => (
                    <option key={j.id} value={j.id}>{j.name} ({j.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">{editItem ? 'Guardar' : 'Crear Calle'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
