'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ApiError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle size={40} className="text-bloods-500 mb-4" />
      <p className="text-lg font-semibold text-white mb-1">Errore di caricamento</p>
      <p className="text-sm text-dark-400 mb-4">Impossibile caricare i dati. Riprova più tardi.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-sm text-white transition-colors"
        >
          <RefreshCw size={14} /> Riprova
        </button>
      )}
    </div>
  );
}
