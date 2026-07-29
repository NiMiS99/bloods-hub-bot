'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, background: '#0a0a12', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ color: '#fff', fontSize: 24, marginBottom: 8 }}>Errore critico</h1>
            <p style={{ color: '#aab2c5', fontSize: 14, marginBottom: 24 }}>
              {error?.message || 'Si è verificato un errore imprevisto.'}
            </p>
            <button
              onClick={reset}
              style={{
                background: 'linear-gradient(135deg, #8b0000, #b91c1c)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Riprova
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
