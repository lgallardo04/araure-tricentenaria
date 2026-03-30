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

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="input-label">
                Correo Electrónico
              </label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="input-label">
                Contraseña
              </label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3"
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

          {/* Info de credenciales de prueba */}
          <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <p className="text-xs text-slate-500 font-medium mb-2">Credenciales de prueba:</p>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p><span className="text-red-400 font-medium">Admin:</span> admin@comuna.com / admin123</p>
              <p><span className="text-purple-400 font-medium">Jefe Comunidad:</span> maria.gonzalez@comuna.com / jefe123</p>
              <p><span className="text-blue-400 font-medium">Jefe de Calle:</span> juan.perez@comuna.com / jefe123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
