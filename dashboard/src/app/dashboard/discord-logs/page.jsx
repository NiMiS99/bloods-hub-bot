'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { timeAgo } from '@/lib/utils';
import { FileText, ChevronLeft, ChevronRight, Trash2, Edit, UserMinus, UserPlus, Hammer, Unlock, MessageSquare } from 'lucide-react';

const EVENT_INFO = {
  message_delete: { label: 'Messaggio eliminato', icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10' },
  message_update: { label: 'Messaggio modificato', icon: Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  member_join: { label: 'Membro entrato', icon: UserPlus, color: 'text-green-400', bg: 'bg-green-500/10' },
  member_leave: { label: 'Membro uscito', icon: UserMinus, color: 'text-dark-400', bg: 'bg-dark-800' },
  member_kick: { label: 'Membro espulso', icon: UserMinus, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  member_ban: { label: 'Membro bannato', icon: Hammer, color: 'text-red-500', bg: 'bg-red-500/10' },
  member_unban: { label: 'Membro sbannato', icon: Unlock, color: 'text-green-400', bg: 'bg-green-500/10' },
  role_create: { label: 'Ruolo creato', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  role_delete: { label: 'Ruolo eliminato', icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10' },
  role_update: { label: 'Ruolo modificato', icon: Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  channel_create: { label: 'Canale creato', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  channel_delete: { label: 'Canale eliminato', icon: Trash2, color: 'text-red-400', bg: 'bg-red-500/10' },
  channel_update: { label: 'Canale modificato', icon: Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

const FILTER_TYPES = [
  { value: 'all', label: 'Tutti' },
  { value: 'message_delete', label: 'Messaggi eliminati' },
  { value: 'message_update', label: 'Messaggi modificati' },
  { value: 'member_join', label: 'Nuovi membri' },
  { value: 'member_leave', label: 'Uscite' },
  { value: 'member_kick', label: 'Espulsioni' },
  { value: 'member_ban', label: 'Ban' },
  { value: 'member_unban', label: 'Unban' },
];

export default function DiscordLogsPage() {
  const { guild } = useGuild();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    api.getDiscordLogs(guild.id, page, filter)
      .then((r) => {
        setLogs(r.logs || []);
        setTotalPages(r.pagination?.totalPages || 1);
        setTotal(r.pagination?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guild, page, filter]);

  if (loading && logs.length === 0) return <div className="spinner mx-auto mt-20" />;
  if (!guild) return <p className="text-dark-400">Seleziona un server.</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-bloods-400" /> Log Discord
        </h1>
        <p className="text-dark-400 text-sm mt-1">Tutte le azioni nel server: messaggi, membri, ruoli, canali</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_TYPES.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.value ? 'bg-bloods-800 text-bloods-200' : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">Nessun log trovato.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => {
              const info = EVENT_INFO[log.eventType] || { label: log.eventType, icon: FileText, color: 'text-dark-400', bg: 'bg-dark-800' };
              const Icon = info.icon;
              return (
                <div key={log.id} className={`card p-3 flex items-center gap-4 ${info.bg}`}>
                  <Icon size={20} className={info.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{info.label}</p>
                    <p className="text-xs text-dark-400 truncate">
                      {log.actorName && <span>da <span className="text-dark-300">{log.actorName}</span> — </span>}
                      {log.targetName && <span>{log.targetName} — </span>}
                      {log.details?.content && <span className="italic">&quot;{log.details.content.substring(0, 60)}&quot;</span>}
                      {log.details?.reason && <span>Motivo: {log.details.reason}</span>}
                      {!log.details?.content && !log.details?.reason && <span>{log.targetType || ''}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-dark-500 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-dark-400">{total} eventi totali</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Precedente
              </button>
              <span className="text-sm text-dark-400 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-secondary disabled:opacity-30 flex items-center gap-1"
              >
                Successivo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
