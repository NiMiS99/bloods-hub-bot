'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDuration } from '@/lib/utils';
import { Activity, Server, MemoryStick, Wifi, Clock, Cpu, CheckCircle, XCircle } from 'lucide-react';

export default function HealthPage() {
  const { guild } = useGuild();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getHealth();
        setHealth(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (error) return (
    <div className="card p-8 text-center">
      <XCircle size={48} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Errore connessione</h2>
      <p className="text-dark-300">{error}</p>
      <p className="text-dark-500 text-sm mt-2">Il server potrebbe essere offline o in riavvio.</p>
    </div>
  );
  if (!health) return (
    <div className="card p-12 text-center">
      <Activity size={40} className="mx-auto mb-3 text-dark-600" />
      <p className="text-dark-400">Nessun dato di health check disponibile.</p>
    </div>
  );

  const memPct = health.memory ? Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Activity /> Health Check</h1>

      {/* Status banner */}
      <div className={`card p-6 ${health.status === 'ok' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <div className="flex items-center gap-4">
          {health.status === 'ok' ? <CheckCircle size={32} className="text-green-400" /> : <XCircle size={32} className="text-red-400" />}
          <div>
            <h2 className="text-lg font-semibold text-white">
              {health.status === 'ok' ? 'Bot operativo' : 'Bot non operativo'}
            </h2>
            <p className="text-dark-300 text-sm">Aggiornamento automatico ogni 5 secondi</p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Uptime */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-blue-400" />
            <h3 className="font-semibold text-white">Uptime</h3>
          </div>
          <p className="text-2xl font-bold text-white">{formatDuration(health.uptime)}</p>
          <p className="text-dark-400 text-sm">Tempo di attività continuo</p>
        </div>

        {/* Ping */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Wifi size={20} className={health.ping < 100 ? 'text-green-400' : health.ping < 300 ? 'text-yellow-400' : 'text-red-400'} />
            <h3 className="font-semibold text-white">Latenza WebSocket</h3>
          </div>
          <p className="text-2xl font-bold text-white">{health.ping}ms</p>
          <p className="text-dark-400 text-sm">
            {health.ping < 100 ? 'Ottima' : health.ping < 300 ? 'Buona' : 'Elevata'}
          </p>
        </div>

        {/* Memory */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <MemoryStick size={20} className="text-purple-400" />
            <h3 className="font-semibold text-white">Memoria Heap</h3>
          </div>
          <p className="text-2xl font-bold text-white">{health.memory?.heapUsed}MB / {health.memory?.heapTotal}MB</p>
          <div className="mt-2 h-2 bg-dark-700 rounded-full overflow-hidden">
            <div className={`h-full ${memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${memPct}%` }} />
          </div>
          <p className="text-dark-400 text-sm mt-1">{memPct}% utilizzato • RSS: {health.memory?.rss}MB</p>
        </div>

        {/* Guilds */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Server size={20} className="text-bloods-400" />
            <h3 className="font-semibold text-white">Server</h3>
          </div>
          <p className="text-2xl font-bold text-white">{health.guilds}</p>
          <p className="text-dark-400 text-sm">Server Discord connessi</p>
        </div>

        {/* Users cached */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={20} className="text-green-400" />
            <h3 className="font-semibold text-white">Utenti in cache</h3>
          </div>
          <p className="text-2xl font-bold text-white">{health.users}</p>
          <p className="text-dark-400 text-sm">Utenti in cache Discord</p>
        </div>

        {/* Node version */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Cpu size={20} className="text-orange-400" />
            <h3 className="font-semibold text-white">Runtime</h3>
          </div>
          <p className="text-2xl font-bold text-white">{health.nodeVersion}</p>
          <p className="text-dark-400 text-sm">Node.js versione</p>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-center text-dark-400 text-sm">
        Ultimo aggiornamento: {new Date(health.timestamp).toLocaleString('it-IT')}
      </div>
    </div>
  );
}
