'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime } from '@/lib/utils';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_LABELS = {
  'dashboard.game.add': 'Gioco aggiunto',
  'dashboard.game.update': 'Gioco aggiornato',
  'dashboard.game.remove': 'Gioco rimosso',
  'dashboard.mod.warn': 'Warning assegnato',
  'dashboard.mod.mute': 'Utente mutato',
  'dashboard.mod.unmute': 'Utente smutato',
  'dashboard.mod.kick': 'Utente kickato',
  'dashboard.mod.ban': 'Utente bannato',
  'dashboard.event.create': 'Evento creato',
  'dashboard.event.delete': 'Evento eliminato',
  'dashboard.settings.update': 'Impostazioni aggiornate',
};

const ACTION_COLORS = {
  'dashboard.game': 'bg-blue-500/20 text-blue-400',
  'dashboard.mod.warn': 'bg-yellow-500/20 text-yellow-400',
  'dashboard.mod.mute': 'bg-orange-500/20 text-orange-400',
  'dashboard.mod.kick': 'bg-red-500/20 text-red-400',
  'dashboard.mod.ban': 'bg-red-600/20 text-red-500',
  'dashboard.event': 'bg-cyan-500/20 text-cyan-400',
  'dashboard.settings': 'bg-purple-500/20 text-purple-400',
};

export default function AuditLogPage() {
  const { guild } = useGuild();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    api.getAuditLog(guild.id, page).then((data) => {
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setLoading(false);
    });
  }, [guild, page]);

  function getActionColor(action) {
    const key = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
    return key ? ACTION_COLORS[key] : 'bg-dark-700 text-dark-300';
  }

  function getActionLabel(action) {
    return ACTION_LABELS[action] || action;
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{total} azioni registrate</p>
      </div>

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center text-dark-400">
            <ScrollText size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nessuna attività registrata.</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-800">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-dark-800/30 transition-colors">
                {log.actorAvatar ? (
                  <img src={log.actorAvatar} alt="" className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold">{log.actorName?.[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{log.actorName}</span>
                    <span className={`badge ${getActionColor(log.action)}`}>{getActionLabel(log.action)}</span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-dark-400 mt-1 font-mono">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </p>
                  )}
                  <p className="text-xs text-dark-500 mt-1">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-800">
            <p className="text-sm text-dark-400">Pagina {page} di {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
