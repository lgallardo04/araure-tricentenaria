// =============================================================
// Gestión de Usuarios (Jefes de Comunidad + Jefes de Calle)
// Admin puede crear/editar/eliminar ambos tipos
// =============================================================

'use client';

import { useEffect, useState } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUser, FiUsers,
  FiMapPin, FiMap, FiShield, FiEye, FiEyeOff
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  cedula: string | null;
  active: boolean;
  comunidadId: string | null;
  comunidad: { id: string; nombre: string } | null;
  callesAsignadas: { id: string; nombre: string; comunidad: { nombre: string } }[];
}

interface Comunidad { id: string; nombre: string; }

export default function GestionUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [tab, setTab] = useState<'JEFE_COMUNIDAD' | 'JEFE_CALLE'>('JEFE_COMUNIDAD');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', cedula: '', role: 'JEFE_COMUNIDAD', comunidadId: '',
  });

  const fetchData = async () => {
    try {
      const [usersRes, comRes] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/comunidades').then((r) => r.json()),
      ]);
      setUsers(usersRes);
      setComunidades(comRes);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter((u) => u.role === tab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem
        ? { id: editItem.id, ...form, password: form.password || undefined }
        : { ...form };

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(editItem ? 'Usuario actualizado' : 'Usuario creado');
      setShowModal(false);
      setEditItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`¿Eliminar a "${user.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Usuario eliminado');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success(user.active ? 'Usuario desactivado' : 'Usuario activado');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', email: '', password: '', phone: '', cedula: '', role: tab, comunidadId: '' });
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditItem(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      cedula: user.cedula || '',
      role: user.role,
      comunidadId: user.comunidadId || '',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
          <p className="text-slate-500 mt-1">Administra jefes de comunidad y jefes de calle</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <FiPlus className="w-5 h-5" />
          Nuevo {tab === 'JEFE_COMUNIDAD' ? 'Jefe de Comunidad' : 'Jefe de Calle'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900 rounded-xl">
        <button
          onClick={() => setTab('JEFE_COMUNIDAD')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
            ${tab === 'JEFE_COMUNIDAD' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FiMap className="w-4 h-4" />
          Jefes de Comunidad ({users.filter((u) => u.role === 'JEFE_COMUNIDAD').length})
        </button>
        <button
          onClick={() => setTab('JEFE_CALLE')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
            ${tab === 'JEFE_CALLE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <FiMapPin className="w-4 h-4" />
          Jefes de Calle ({users.filter((u) => u.role === 'JEFE_CALLE').length})
        </button>
      </div>

      {/* Lista de usuarios como tarjetas (mobile-friendly) */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card text-center py-12 text-slate-500">
          <FiUsers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay {tab === 'JEFE_COMUNIDAD' ? 'Jefes de Comunidad' : 'Jefes de Calle'} registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className={`glass-card p-4 ${!user.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                  ${user.role === 'JEFE_COMUNIDAD' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                  <FiUser className={`w-5 h-5 ${user.role === 'JEFE_COMUNIDAD' ? 'text-purple-400' : 'text-blue-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{user.name}</h3>
                    {!user.active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  {user.cedula && <p className="text-xs text-slate-600">CI: {user.cedula}</p>}
                  {user.phone && <p className="text-xs text-slate-600">Tel: {user.phone}</p>}
                  {user.comunidad && (
                    <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                      <FiMap className="w-3 h-3" />
                      {user.comunidad.nombre.replace('Consejo Comunal ', '')}
                    </p>
                  )}
                  {user.callesAsignadas.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.callesAsignadas.map((c) => (
                        <span key={c.id} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                          {c.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(user)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(user)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-yellow-400 transition-colors" title={user.active ? 'Desactivar' : 'Activar'}>
                    {user.active ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(user)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-semibold text-white">
                {editItem ? 'Editar Usuario' : `Nuevo ${tab === 'JEFE_COMUNIDAD' ? 'Jefe de Comunidad' : 'Jefe de Calle'}`}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="input-label">Nombre Completo *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field" placeholder="Nombre y apellido" required />
              </div>

              <div>
                <label className="input-label">Correo Electrónico *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field" placeholder="correo@ejemplo.com" required />
              </div>

              <div>
                <label className="input-label">{editItem ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field pr-10" placeholder="••••••••" required={!editItem} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Cédula</label>
                  <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                    className="input-field" placeholder="V-12345678" />
                </div>
                <div>
                  <label className="input-label">Teléfono</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field" placeholder="0414-1234567" />
                </div>
              </div>

              <div>
                <label className="input-label">Rol *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="select-field">
                  <option value="JEFE_COMUNIDAD">Jefe de Comunidad</option>
                  <option value="JEFE_CALLE">Jefe de Calle</option>
                </select>
              </div>

              {form.role === 'JEFE_COMUNIDAD' && (
                <div>
                  <label className="input-label">Comunidad Asignada *</label>
                  <select value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}
                    className="select-field" required>
                    <option value="">Seleccionar comunidad...</option>
                    {comunidades.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editItem ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
