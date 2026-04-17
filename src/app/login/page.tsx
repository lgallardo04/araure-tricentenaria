// =============================================================
// Página de Login
// Formulario de autenticación con email y contraseña
// =============================================================

'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiMail, FiLock, FiLogIn, FiShield } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email o contraseña incorrectos');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 mb-4 shadow-lg shadow-blue-500/30 animate-pulse-glow">
            <FiShield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Comuna Araure
          </h1>
          <p className="text-lg text-blue-400 font-semibold">Tricentenaria</p>
          <p className="text-sm text-slate-500 mt-2">Sistema de Censo Comunal</p>
        </div>

        {/* Formulario */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex justify-between items-end">
                <label htmlFor="email" className="input-label mb-1">
                  Correo Electrónico <span className="text-red-400">*</span>
                </label>
                {error && <span className="text-red-400 text-[11px] font-semibold animate-pulse mb-1">{error}</span>}
              </div>
              <div className="relative">
                <FiMail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${error ? 'text-red-400' : 'text-slate-500'}`} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="correo@ejemplo.com"
                  className={`input-field pl-12 ${error ? 'border-red-500 bg-red-900/20 shadow-inner shadow-red-500/20' : ''}`}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="input-label mb-1">
                Contraseña <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <FiLock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${error ? 'text-red-400' : 'text-slate-500'}`} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={`input-field pl-12 ${error ? 'border-red-500 bg-red-900/20 shadow-inner shadow-red-500/20' : ''}`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiLogIn className="w-5 h-5" />
                  Ingresar
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
