'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { timeAgo } from '@/lib/utils';
import { Shield, AlertTriangle, Mic, MicOff, UserX, Ban, Plus, X } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function ModerationPage() {
  const { guild } = useGuild();
  const [warnings, setWarnings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [action, setAction] = useState(null);
  const [form, setForm] = useState({ userId: '', reason: '', severity: 'low', durationMinutes: 60 });

  useEffect(() => { if (guild) loadWarnings(); }, [guild, page]);

  async function loadWarnings() {
    setLoading(true);
    const data = await api.getWarnings(guild.id, page);
    setWarnings(data.warnings);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }

  async function submitAction() {
    if (!form.userId || !form.reason) return;
    if (action === 'warn') await api.addWarning(guild.id, { userId: form.userId, reason: form.reason, severity: form.severity });
    else if (action === 'mute') await api.muteUser(guild.id, { userId: form.userId, reason: form.reason, durationMinutes: parseInt(form.durationMinutes) });
    else if (action === 'kick') await api.kickUser(guild.id, { userId: form.userId, reason: form.reason });
    else if (action === 'ban') await api.banUser(guild.id, { userId: form.userId, reason: form.reason });
    setAction(null);
    setShowAdd(false);
    setForm({ userId: '', reason: '', severity: 'low', durationMinutes: 60 });
    loadWarnings();
  }

  const actions = [
    { id: 'warn', label: 'Warning', icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'mute', label: 'Mute', icon: MicOff, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'kick', label: 'Kick', icon: UserX, color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'ban', label: 'Ban', icon: Ban, color: 'text-red-600', bg: 'bg-red-600/10' },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.id} onClick={() => { setAction(a.id); setShowAdd(true); }} className={`card p-4 flex flex-col items-center gap-2 hover:border-dark-600 transition-all ${a.bg}`}>
              <Icon size={24} className={a.color} />
              <span className="text-sm font-medium text-white">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white capitalize">{actions.find(a => a.id === action)?.label}</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-dark-800 rounded-lg"><X size={18} className="text-dark-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-dark-300 mb-1 block">ID utente</label>
                <input className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="123456789012345678" />
              </div>
              <div>
                <label className="text-sm text-dark-300 mb-1 block">Motivo</label>
                <textarea className="input min-h-[80px]" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Motivo dell'azione..." />
              </div>
              {action === 'warn' && (
                <div>
                  <label className="text-sm text-dark-300 mb-1 block">Severità</label>
                  <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                    <option value="low">Basso</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                  </select>
                </div>
              )}
              {action === 'mute' && (
                <div>
                  <label className="text-sm text-dark-300 mb-1 block">Durata (minuti)</label>
                  <input type="number" className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} min="1" max="40320" />
                </div>
              )}
              <button onClick={submitAction} className="btn-primary w-full">Conferma</button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings list */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-dark-800">
          <Shield size={18} className="text-bloods-500" />
          <h3 className="font-semibold text-white">Storico Warning ({total})</h3>
        </div>
        {warnings.length === 0 ? (
          <div className="p-12 text-center text-dark-400">
            <Shield size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nessun warning registrato.</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {warnings.map((w) => (
              <div key={w.id} className="flex items-center gap-4 p-4 hover:bg-dark-800/30 transition-colors">
                {w.avatar ? <img src={w.avatar} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold">{w.username?.[0]}</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{w.username}</p>
                    <span className={`badge ${w.severity === 'high' ? 'bg-red-500/20 text-red-400' : w.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{w.severity}</span>
                  </div>
                  <p className="text-sm text-dark-300 mt-0.5">{w.reason}</p>
                  <p className="text-xs text-dark-500 mt-1">Da {w.issuedByUsername} • {timeAgo(w.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800">
            <p className="text-sm text-dark-400">Pagina {page} di {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 disabled:opacity-30">Precedente</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 disabled:opacity-30">Successivo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
