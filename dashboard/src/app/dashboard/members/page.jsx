'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatNumber, formatDuration, timeAgo } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, Shield, Award, MessageSquare, Mic, X } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function MembersPage() {
  const { guild } = useGuild();
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (guild) loadMembers();
  }, [guild, page]);

  useEffect(() => {
    const t = setTimeout(() => { if (guild) { setPage(1); loadMembers(); } }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function loadMembers() {
    setLoading(true);
    const data = await api.getMembers(guild.id, page, search);
    setMembers(data.members);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setLoading(false);
  }

  async function viewMember(userId) {
    const data = await api.getMember(guild.id, userId);
    setSelected(data);
  }

  if (loading && members.length === 0) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input className="input pl-10" placeholder="Cerca membro..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-dark-400">{formatNumber(total)} membri</p>
      </div>

      {/* Members table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase">
              <th className="text-left p-4 font-medium">Membro</th>
              <th className="text-left p-4 font-medium">Livello</th>
              <th className="text-left p-4 font-medium">XP</th>
              <th className="text-left p-4 font-medium">Messaggi</th>
              <th className="text-left p-4 font-medium">Voice</th>
              <th className="text-left p-4 font-medium">Badge</th>
              <th className="text-left p-4 font-medium">Warning</th>
              <th className="text-left p-4 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} onClick={() => viewMember(m.id)} className="border-b border-dark-800/50 hover:bg-dark-800/50 cursor-pointer transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {m.avatar ? <img src={m.avatar} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold">{m.username?.[0]}</div>}
                    <div>
                      <p className="text-white font-medium">{m.discordUsername || m.username}</p>
                      {m.legacyWow && <span className="text-xs text-yellow-500">WoW Legacy</span>}
                    </div>
                  </div>
                </td>
                <td className="p-4"><span className="badge bg-bloods-800/30 text-bloods-400">Lv {m.level}</span></td>
                <td className="p-4 text-white">{formatNumber(m.xp)}</td>
                <td className="p-4 text-dark-300">{formatNumber(m.totalMessages)}</td>
                <td className="p-4 text-dark-300">{formatDuration(m.totalVoiceSeconds)}</td>
                <td className="p-4"><Award size={16} className="text-yellow-500" /><span className="text-dark-300">{m.badges}</span></td>
                <td className="p-4">{m.warnings > 0 ? <span className="badge bg-red-500/20 text-red-400">{m.warnings}</span> : <span className="text-dark-500">0</span>}</td>
                <td className="p-4"><span className={`w-2 h-2 rounded-full inline-block ${m.isOnline !== 'offline' ? 'bg-green-500' : 'bg-dark-600'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-dark-800">
          <p className="text-sm text-dark-400">Pagina {page} di {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Member detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              {selected.discord?.avatar ? <img src={selected.discord.avatar} alt="" className="w-16 h-16 rounded-full" /> : <div className="w-16 h-16 rounded-full bg-dark-700 flex items-center justify-center text-xl font-bold">{selected.user.username?.[0]}</div>}
              <div>
                <h2 className="text-xl font-bold text-white">{selected.discord?.displayName || selected.user.username}</h2>
                <p className="text-sm text-dark-400">Livello {selected.user.level} • {formatNumber(selected.user.xp)} XP</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto p-2 hover:bg-dark-800 rounded-lg"><X size={20} className="text-dark-400" /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-3 text-center"><MessageSquare size={16} className="mx-auto text-green-500 mb-1" /><p className="text-lg font-bold text-white">{formatNumber(selected.user.totalMessages)}</p><p className="text-xs text-dark-400">Messaggi</p></div>
              <div className="card p-3 text-center"><Mic size={16} className="mx-auto text-purple-500 mb-1" /><p className="text-lg font-bold text-white">{formatDuration(selected.user.totalVoiceSeconds)}</p><p className="text-xs text-dark-400">Voice</p></div>
              <div className="card p-3 text-center"><Award size={16} className="mx-auto text-yellow-500 mb-1" /><p className="text-lg font-bold text-white">{selected.badges.length}</p><p className="text-xs text-dark-400">Badge</p></div>
              <div className="card p-3 text-center"><Shield size={16} className="mx-auto text-red-500 mb-1" /><p className="text-lg font-bold text-white">{selected.warnings.length}</p><p className="text-xs text-dark-400">Warning</p></div>
            </div>

            {selected.discord?.roles?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">Ruoli</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.discord.roles.map((r) => <span key={r.id} className="badge" style={{ background: r.color ? `#${r.color.toString(16).padStart(6, '0')}20` : '#2a2a3e', color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#aab2c5' }}>{r.name}</span>)}
                </div>
              </div>
            )}

            {selected.games.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">Giochi</h3>
                <div className="flex flex-wrap gap-2">{selected.games.map((g, i) => <span key={i} className="badge bg-bloods-800/30 text-bloods-400">{g.name}</span>)}</div>
              </div>
            )}

            {selected.warnings.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">Warning</h3>
                <div className="space-y-2">{selected.warnings.map((w) => (
                  <div key={w.id} className="card p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`badge ${w.severity === 'high' ? 'bg-red-500/20 text-red-400' : w.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{w.severity}</span>
                      <span className="text-xs text-dark-400">{timeAgo(w.createdAt)}</span>
                    </div>
                    <p className="text-dark-300">{w.reason}</p>
                  </div>
                ))}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
