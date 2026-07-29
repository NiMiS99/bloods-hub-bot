'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card p-8 max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Si è verificato un errore</h2>
        <p className="text-dark-300 text-sm">
          {error?.message || 'Errore sconosciuto. Riprova o ricarica la pagina.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={16} /> Riprova
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} /> Ricarica pagina
          </button>
        </div>
      </div>
    </div>
  );
}
