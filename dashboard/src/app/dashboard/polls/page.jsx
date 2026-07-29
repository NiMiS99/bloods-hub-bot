'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime } from '@/lib/utils';
import { BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function PollsPage() {
  const { guild } = useGuild();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { polls } = await api.getPolls(guild.id);
    setPolls(polls);
    setLoading(false);
  }

  async function closePoll(id) {
    if (!confirm('Chiudere questo sondaggio ora?')) return;
    await api.closePoll(guild.id, id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 /> Sondaggi</h1>
      <p className="text-dark-400">{polls.length} sondaggi</p>

      {polls.length === 0 ? (
        <div className="card p-12 text-center text-dark-400">Nessun sondaggio trovato.</div>
      ) : (
        <div className="space-y-3">
          {polls.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {p.is_closed ? <CheckCircle size={16} className="text-green-400" /> : <Clock size={16} className="text-yellow-400" />}
                    <span className={`px-2 py-0.5 rounded text-xs ${p.is_closed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {p.is_closed ? 'Chiuso' : 'Attivo'}
                    </span>
                    <span className="text-xs text-dark-400">{formatDateTime(p.created_at)}</span>
                  </div>
                  <p className="text-white font-medium mb-2">{p.question}</p>
                  {p.options && (
                    <div className="space-y-1">
                      {p.options.map((opt, i) => (
                        <div key={i} className="text-sm text-dark-300">{opt.emoji} {opt.text}</div>
                      ))}
                    </div>
                  )}
                  {p.expires_at && !p.is_closed && (
                    <p className="text-xs text-dark-400 mt-2">Scade: {formatDateTime(p.expires_at)}</p>
                  )}
                </div>
                {!p.is_closed && (
                  <button onClick={() => closePoll(p.id)} className="btn-secondary text-sm">Chiudi</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
