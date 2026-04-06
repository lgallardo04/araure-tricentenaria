'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiHome, FiRefreshCw } from 'react-icons/fi';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-red-500/15 items-center justify-center">
          <FiAlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">Algo salió mal</h1>
        <p className="text-slate-400 text-sm">
          No pudimos mostrar esta página. Puede intentar de nuevo o volver al inicio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary inline-flex items-center justify-center gap-2 py-2.5"
          >
            <FiRefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <FiHome className="w-4 h-4" />
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
