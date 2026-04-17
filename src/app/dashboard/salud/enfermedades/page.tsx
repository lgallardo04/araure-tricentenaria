// =============================================================
// Catálogo de Enfermedades — CRUD completo
// Gestión del catálogo de enfermedades del sistema de salud
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FiHeart, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

interface Enfermedad {
  id: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  _count: { registros: number };
}

const TIPOS = ['Crónica', 'Aguda', 'Infecciosa', 'Degenerativa', 'Mental', 'Otra'];

export default function EnfermedadesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { data: enfermedades = [], mutate } = useSWR<Enfermedad[]>('/api/enfermedades');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipo: 'Crónica', descripcion: '' });

  const filtered = enfermedades.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.tipo.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm({ nombre: '', tipo: 'Crónica', descripcion: '' }); setEditId(null); setErrors({}); setShowForm(false); };

  const handleEdit = (e: Enfermedad) => {
    setForm({ nombre: e.nombre, tipo: e.tipo, descripcion: e.descripcion || '' });
    setEditId(e.id);
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { 
      setErrors({nombre: 'Obligatorio'}); 
      toast.error('Revise los campos en rojo'); 
      return; 
    }
    
    setIsSaving(true);
    try {
      const body = editId ? { id: editId, ...form } : form;
      const res = await apiFetch('/api/enfermedades', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { 
        const err = await res.json().catch(() => ({})); 
        if (err.details?.fieldErrors) {
          const validationErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.details.fieldErrors)) validationErrors[k] = (v as string[])[0];
          setErrors(validationErrors);
          toast.error('Revise los campos en rojo');
          return;
        }
        toast.error(err.error || 'Error de servidor'); 
        return; 
      }
      toast.success(editId ? 'Enfermedad actualizada' : 'Enfermedad creada');
      resetForm();
      mutate();
    } catch { 
      toast.error('Error de conexión al guardar'); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      const res = await apiFetch(`/api/enfermedades?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error((j as any).error || 'Error'); return; }
      toast.success('Enfermedad eliminada');
      mutate();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiHeart className="w-6 h-6 text-red-400" /> Catálogo de Enfermedades
          </h2>
          <p className="text-slate-500 mt-1">{enfermedades.length} enfermedades registradas</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
            <FiPlus className="w-4 h-4" /> Nueva Enfermedad
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar enfermedad..." className="input-field pl-12" />
        {search && (<button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><FiX className="w-4 h-4" /></button>)}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">{editId ? 'Editar Enfermedad' : 'Nueva Enfermedad'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="label-field mb-0">Nombre <span className="text-red-400">*</span></label>
                {errors.nombre && <span className="text-red-400 text-[11px] font-semibold animate-pulse">{errors.nombre}</span>}
              </div>
              <input type="text" value={form.nombre} onChange={e => { setForm({...form, nombre: e.target.value}); setErrors({}); }} className={`input-field ${errors.nombre ? 'border-red-500 bg-red-900/20' : ''}`} placeholder="Hipertensión arterial" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="label-field mb-0">Tipo <span className="text-red-400">*</span></label>
              </div>
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="select-field">
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Descripción</label>
              <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="input-field" placeholder="Opcional" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" disabled={isSaving} onClick={handleSubmit} className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-wait">
              {isSaving ? 'Guardando...' : 'Guardar Datos'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map(e => (
          <div key={e.id} className="glass-card p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <FiHeart className="w-5 h-5 text-red-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-white truncate">{e.nombre}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className={`px-2 py-0.5 rounded-full ${
                    e.tipo === 'Crónica' ? 'bg-yellow-500/15 text-yellow-400' :
                    e.tipo === 'Aguda' ? 'bg-red-500/15 text-red-400' :
                    e.tipo === 'Infecciosa' ? 'bg-orange-500/15 text-orange-400' :
                    'bg-slate-500/15 text-slate-400'
                  }`}>{e.tipo}</span>
                  {e.descripcion && <span className="truncate">{e.descripcion}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="badge-blue text-xs">{e._count.registros} casos</span>
              {isAdmin && (
                <>
                  <button onClick={() => handleEdit(e)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(e.id, e.nombre)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 px-4 text-slate-400 glass-card mx-auto mt-8 border-none shadow-none bg-transparent">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <FiHeart className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No se descubrieron enfermedades</h3>
            <p className="max-w-md mx-auto mb-6">El catálogo está vacío o la búsqueda no coincide con ningún registro. Registra una nueva dolencia desde el botón superior.</p>
          </div>
        )}
      </div>
    </div>
  );
}
