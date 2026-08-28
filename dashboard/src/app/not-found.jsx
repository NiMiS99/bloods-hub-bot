import Link from 'next/link';
import { Home, MessageCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-bloods-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-bloods-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative text-center max-w-md">
        <img
          src="/logo.png"
          alt="Bloods"
          className="mx-auto h-24 w-24 mb-8 drop-shadow-[0_10px_40px_rgba(139,0,0,0.45)]"
        />
        <h1 className="text-7xl font-extrabold text-bloods-500 mb-4">404</h1>
        <p className="text-xl text-white mb-2">Pagina non trovata</p>
        <p className="text-dark-400 mb-8">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-bloods-700 hover:bg-bloods-600 text-white font-medium transition-colors"
          >
            <Home size={18} />
            Torna alla home
          </Link>
          <a
            href="https://discord.gg/DrGMeEMxF6"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
          >
            <MessageCircle size={18} />
            Discord
          </a>
        </div>
      </div>
    </div>
  );
}
