// =============================================================
// Catálogo de Medicamentos — CRUD completo
// Gestión del catálogo de medicamentos del sistema de salud
// =============================================================

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

interface Medicamento {
  id: string;
  nombre: string;
  principioActivo: string;
  presentacion: string | null;
  unidad: string | null;
  descripcion: string | null;
  _count: { registros: number };
}

const UNIDADES = ['Tableta', 'Cápsula', 'ml', 'Ampolla', 'Sobre', 'Gotas', 'Parche', 'Otra'];

export default function MedicamentosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const { data: medicamentos = [], mutate } = useSWR<Medicamento[]>('/api/medicamentos');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', principioActivo: '', presentacion: '', unidad: '', descripcion: '' });

  const filtered = medicamentos.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.principioActivo.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => { setForm({ nombre: '', principioActivo: '', presentacion: '', unidad: '', descripcion: '' }); setEditId(null); setErrors({}); setShowForm(false); };

  const handleEdit = (m: Medicamento) => {
    setForm({
      nombre: m.nombre,
      principioActivo: m.principioActivo,
      presentacion: m.presentacion || '',
      unidad: m.unidad || '',
      descripcion: m.descripcion || '',
    });
    });
    setEditId(m.id);
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.nombre.trim()) newErrors.nombre = 'Obligatorio';
    if (!form.principioActivo.trim()) newErrors.principioActivo = 'Obligatorio';
    
    if (Object.keys(newErrors).length > 0) { 
      setErrors(newErrors); 
      return; 
    }

    setIsSaving(true);
    try {
      const body = editId ? { id: editId, ...form } : form;
      const res = await apiFetch('/api/medicamentos', {
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
          toast.error('Revise los campos requeridos en rojo');
          return;
        }
        toast.error(err.error || 'Error del servidor'); 
        return; 
      }
      toast.success(editId ? 'Medicamento actualizado' : 'Medicamento creado');
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
      const res = await apiFetch(`/api/medicamentos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error((j as any).error || 'Error'); return; }
      toast.success('Medicamento eliminado');
      mutate();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiPackage className="w-6 h-6 text-blue-400" /> Catálogo de Medicamentos
          </h2>
          <p className="text-slate-500 mt-1">{medicamentos.length} medicamentos registrados</p>
        </div>
        {isAdmin && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
            <FiPlus className="w-4 h-4" /> Nuevo Medicamento
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o principio activo..." className="input-field pl-12" />
        {search && (<button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><FiX className="w-4 h-4" /></button>)}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">{editId ? 'Editar Medicamento' : 'Nuevo Medicamento'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="label-field mb-0">Nombre Comercial <span className="text-red-400">*</span></label>
                {errors.nombre && <span className="text-red-400 text-[11px] font-semibold animate-pulse">{errors.nombre}</span>}
              </div>
              <input type="text" value={form.nombre} onChange={e => { setForm({...form, nombre: e.target.value}); setErrors({...errors, nombre: ''}); }} className={`input-field ${errors.nombre ? 'border-red-500 bg-red-900/20' : ''}`} placeholder="Ej: Losartán" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="label-field mb-0">Principio Activo <span className="text-red-400">*</span></label>
                {errors.principioActivo && <span className="text-red-400 text-[11px] font-semibold animate-pulse">{errors.principioActivo}</span>}
              </div>
              <input type="text" value={form.principioActivo} onChange={e => { setForm({...form, principioActivo: e.target.value}); setErrors({...errors, principioActivo: ''}); }} className={`input-field ${errors.principioActivo ? 'border-red-500 bg-red-900/20' : ''}`} placeholder="Ej: Losartán Potásico" />
            </div>
            <div>
              <label className="label-field">Presentación</label>
              <input type="text" value={form.presentacion} onChange={e => setForm({...form, presentacion: e.target.value})} className="input-field" placeholder="Tabletas 50mg" />
            </div>
            <div>
              <label className="label-field">Unidad</label>
              <select value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} className="select-field">
                <option value="">Seleccionar...</option>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Descripción</label>
            <input type="text" value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="input-field" placeholder="Antihipertensivo antagonista de angiotensina II" />
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
        {filtered.map(m => (
          <div key={m.id} className="glass-card p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <FiPackage className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-white truncate">{m.nombre}</h4>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="text-emerald-400">{m.principioActivo}</span>
                  {m.presentacion && <span>• {m.presentacion}</span>}
                  {m.unidad && <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">{m.unidad}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="badge-blue text-xs">{m._count.registros} usos</span>
              {isAdmin && (
                <>
                  <button onClick={() => handleEdit(m)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-blue-400 transition-colors">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(m.id, m.nombre)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
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
              <FiPackage className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No se descubrieron medicamentos</h3>
            <p className="max-w-md mx-auto mb-6">El catálogo está vacío o la búsqueda no coincide con ningún registro. Registra un nuevo medicamento desde el botón superior.</p>
          </div>
        )}
      </div>
    </div>
  );
}
