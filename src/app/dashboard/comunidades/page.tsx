// =============================================================
// Gestión de Comunidades
// CRUD para Consejos Comunales
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FiPlus, FiEdit2, FiTrash2, FiMap, FiX, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/api';

interface Comunidad {
  id: string;
  nombre: string;
  jefeComunidad: string | null;
  descripcion: string | null;
  calles: { id: string; nombre: string }[];
}

export default function ComunidadesPage() {
  const { data: comunidades = [], isLoading: loading, mutate } = useSWR<Comunidad[]>('/api/comunidades');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Comunidad | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ nombre: '', jefeComunidad: '', descripcion: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await apiFetch('/api/comunidades', {
        method,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.details?.fieldErrors) {
           setErrors({nombre: 'Nombre requerido'}); 
           return;
        }
        throw new Error();
      }
      toast.success(editItem ? 'Comunidad actualizada' : 'Comunidad creada');
      setShowModal(false);
      setEditItem(null);
      setErrors({});
      setForm({ nombre: '', jefeComunidad: '', descripcion: '' });
      mutate();
    } catch {
      toast.error('Error al guardar la comunidad. Por favor revise el formato.');
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán también sus calles y datos de censo.`)) return;
    try {
      const res = await apiFetch(`/api/comunidades?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Comunidad eliminada');
      mutate();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openEdit = (item: Comunidad) => {
    setEditItem(item);
    setErrors({});
    setForm({ nombre: item.nombre, jefeComunidad: item.jefeComunidad || '', descripcion: item.descripcion || '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Comunidades</h2>
          <p className="text-slate-500 mt-1">Gestiona los Consejos Comunales</p>
        </div>
        <button onClick={() => { setEditItem(null); setErrors({}); setForm({ nombre: '', jefeComunidad: '', descripcion: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" />
          Nueva Comunidad
        </button>
      </div>

      {/* Grid de comunidades */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : comunidades.length === 0 ? (
        <div className="text-center py-16 px-4 text-slate-400 glass-card mx-auto max-w-2xl mt-8">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
            <FiMap className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Configure su Primera Comunidad</h3>
          <p className="max-w-sm mx-auto mb-6">Aún no hay Consejos Comunales registrados. Para empezar a organizar los censos, cree una ahora.</p>
          <button onClick={() => { setEditItem(null); setErrors({}); setForm({ nombre: '', jefeComunidad: '', descripcion: '' }); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2">
            <FiPlus className="w-5 h-5" />
            Haz clic aquí para crearla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comunidades.map((com) => (
            <div key={com.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <FiMap className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{com.nombre}</h3>
                    {com.jefeComunidad && (
                      <p className="text-xs text-slate-500">Jefe: {com.jefeComunidad}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(com)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(com.id, com.nombre)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {com.descripcion && (
                <p className="text-xs text-slate-500 mb-3">{com.descripcion}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FiMapPin className="w-3 h-3" />
                <span>{com.calles.length} calle{com.calles.length !== 1 ? 's' : ''}</span>
              </div>

              {com.calles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {com.calles.map((c) => (
                    <span key={c.id} className="badge-blue text-xs">{c.nombre}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editItem ? 'Editar Comunidad' : 'Nueva Comunidad'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-end">
                  <label className="input-label mb-1">Nombre de la Comunidad <span className="text-red-400">*</span></label>
                  {errors.nombre && <span className="text-red-400 text-[11px] font-semibold animate-pulse mb-1">{errors.nombre}</span>}
                </div>
                <input value={form.nombre} onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setErrors({}); }} 
                  className={`input-field ${errors.nombre ? 'border-red-500 bg-red-900/20' : ''}`} placeholder="Ej: Consejo Comunal Barrio Unión" />
              </div>
              <div>
                <label className="input-label mb-1">Jefe de Comunidad</label>
                <input value={form.jefeComunidad} onChange={(e) => setForm({ ...form, jefeComunidad: e.target.value })} className="input-field" placeholder="Nombre completo (Opcional)" />
              </div>
              <div>
                <label className="input-label mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="input-field max-h-32" rows={3} placeholder="Detalles de la comunidad (Opcional)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Guardando...' : (editItem ? 'Guardar Cambios' : 'Crear Comunidad')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
