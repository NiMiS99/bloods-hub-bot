'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime } from '@/lib/utils';
import { Lightbulb, ThumbsUp, ThumbsDown, Check, X } from 'lucide-react';
import { UserMention } from '@/lib/useUsers';

const STATUS_COLORS = {
  open: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  implemented: 'bg-purple-500/20 text-purple-400',
};

export default function SuggestionsPage() {
  const { guild } = useGuild();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { if (guild) load(); }, [guild, filter]);

  async function load() {
    const { suggestions } = await api.getSuggestions(guild.id, filter);
    setSuggestions(suggestions);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await api.updateSuggestionStatus(guild.id, id, status);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Lightbulb /> Suggerimenti</h1>
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tutti</option>
          <option value="open">Aperti</option>
          <option value="approved">Approvati</option>
          <option value="rejected">Rifiutati</option>
          <option value="implemented">Implementati</option>
        </select>
      </div>

      <p className="text-dark-400">{suggestions.length} suggerimenti</p>

      {suggestions.length === 0 ? (
        <div className="card p-12 text-center text-dark-400">Nessun suggerimento trovato.</div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || STATUS_COLORS.open}`}>{s.status}</span>
                    <span className="text-xs text-dark-400">da <UserMention userId={s.user_id} guildId={guild.id} /> • {formatDateTime(s.created_at)}</span>
                  </div>
                  <p className="text-white">{s.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="flex items-center gap-1 text-green-400"><ThumbsUp size={14} /> {s.upvotes}</span>
                    <span className="flex items-center gap-1 text-red-400"><ThumbsDown size={14} /> {s.downvotes}</span>
                    <span className="text-dark-300">Netto: {s.upvotes - s.downvotes}</span>
                  </div>
                </div>
                {s.status === 'open' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(s.id, 'approved')} className="btn-success p-2" title="Approva"><Check size={16} /></button>
                    <button onClick={() => updateStatus(s.id, 'rejected')} className="btn-danger p-2" title="Rifiuta"><X size={16} /></button>
                    <button onClick={() => updateStatus(s.id, 'implemented')} className="btn-primary p-2" title="Implementato">✓</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
