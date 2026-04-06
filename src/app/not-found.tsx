import Link from 'next/link';
import { FiHome, FiSearch } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700">
          <FiSearch className="w-8 h-8 text-slate-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">Página no encontrada</h1>
        <p className="text-slate-400 text-sm">
          La ruta que busca no existe o ya no está disponible.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 btn-primary py-3 px-6 mt-2"
        >
          <FiHome className="w-5 h-5" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
