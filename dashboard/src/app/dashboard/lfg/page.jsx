'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Gamepad2, Users, Clock } from 'lucide-react';

const STATUS_COLORS = {
  open: 'bg-green-500/20 text-green-400',
  full: 'bg-red-500/20 text-red-400',
  closed: 'bg-gray-500/20 text-gray-400',
  expired: 'bg-gray-500/20 text-gray-400',
};

export default function LfgPage() {
  const { guild } = useGuild();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { sessions } = await api.getLfgSessions(guild.id);
    setSessions(sessions);
    setLoading(false);
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Gamepad2 /> Sessioni LFG</h1>
      <p className="text-dark-400">{sessions.length} sessioni</p>

      {sessions.length === 0 ? (
        <div className="card p-12 text-center text-dark-400">Nessuna sessione LFG attiva.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{s.game_name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[s.status] || STATUS_COLORS.open}`}>{s.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-dark-300"><Users size={14} /> {s.participants?.length || 0}/{s.slots} posti</div>
                <div className="text-dark-300">Modalità: {s.mode}</div>
                {s.notes && <div className="text-dark-300">Note: {s.notes}</div>}
                <div className="flex items-center gap-2 text-dark-400"><Clock size={14} /> {timeAgo(s.created_at)}</div>
                {s.expires_at && <div className="text-dark-400">Scade: {formatDateTime(s.expires_at)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
