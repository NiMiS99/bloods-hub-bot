'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime } from '@/lib/utils';
import { ClipboardList, AlertCircle, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  open: { label: 'Aperto', color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
  approved: { label: 'Approvato', color: 'bg-orange-500/20 text-orange-400', icon: Clock },
  in_progress: { label: 'In Lavorazione', color: 'bg-blue-500/20 text-blue-400', icon: Loader2 },
  resolved: { label: 'Risolto', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  closed: { label: 'Chiuso', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
};

const PRIORITY_CONFIG = {
  low: { label: 'Bassa', color: 'text-green-400' },
  medium: { label: 'Media', color: 'text-yellow-400' },
  high: { label: 'Alta', color: 'text-orange-400' },
  critical: { label: 'Critica', color: 'text-red-400' },
};

const CATEGORY_LABELS = {
  permissions: 'Permessi',
  bot_command: 'Comando Bot',
  bot_bug: 'Bug Bot',
  dashboard: 'Dashboard',
  feature_request: 'Nuova Feature',
  other: 'Altro',
};

export default function FeedbackPage() {
  const { guild } = useGuild();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => { if (guild) load(); }, [guild, filter]);

  async function load() {
    setLoading(true);
    try {
      const [statsData, ticketsData] = await Promise.all([
        api.getFeedbackStats(guild.id),
        api.getFeedback(guild.id, filter),
      ]);
      setStats(statsData);
      setTickets(ticketsData.tickets || []);
    } catch (err) {
      console.error('Feedback load error:', err);
    }
    setLoading(false);
  }

  async function changeStatus(id, status) {
    try {
      await api.updateFeedbackStatus(guild.id, id, status);
      await load();
      if (selected?.id === id) {
        setSelected({ ...selected, status });
      }
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold">Segnalazioni Admin</h1>
          <p className="text-gray-400 text-sm">Ticket dal canale #modifiche-da-apportare</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Totali" value={stats.total} color="text-white" />
          <StatCard label="Aperti" value={stats.open} color="text-red-400" />
          <StatCard label="Approvati" value={stats.approved} color="text-orange-400" />
          <StatCard label="In Lavorazione" value={stats.inProgress} color="text-blue-400" />
          <StatCard label="Risolti" value={stats.resolved} color="text-green-400" />
          <StatCard label="Chiusi" value={stats.closed} color="text-gray-400" />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'approved', 'in_progress', 'resolved', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === s
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'Tutti' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Tickets */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Ticket list */}
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nessuna segnalazione {filter !== 'all' ? `con stato "${STATUS_CONFIG[filter]?.label}"` : ''}</p>
            </div>
          ) : (
            tickets.map((t) => {
              const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
              const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
              const Icon = st.icon;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`bg-gray-800/50 rounded-xl p-4 cursor-pointer transition border ${
                    selected?.id === t.id ? 'border-red-500' : 'border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">#{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${st.color}`}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {st.label}
                      </span>
                      <span className={`text-xs ${pr.color}`}>{pr.label}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 truncate">{t.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                    <span>·</span>
                    <span>{t.author_username}</span>
                    <span>·</span>
                    <span>{formatDateTime(t.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-500">#{selected.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CONFIG[selected.status]?.color}`}>
                  {STATUS_CONFIG[selected.status]?.label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg font-bold mb-3">{selected.title}</h2>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Categoria:</span>{' '}
                <span className="text-white">{CATEGORY_LABELS[selected.category] || selected.category}</span>
              </div>
              <div>
                <span className="text-gray-500">Priorità:</span>{' '}
                <span className={PRIORITY_CONFIG[selected.priority]?.color}>
                  {PRIORITY_CONFIG[selected.priority]?.label}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Segnalato da:</span>{' '}
                <span className="text-white">{selected.author_username}</span>
              </div>
              <div>
                <span className="text-gray-500">Data:</span>{' '}
                <span className="text-white">{formatDateTime(selected.created_at)}</span>
              </div>
              {selected.affected_channels && (
                <div>
                  <span className="text-gray-500">Canali/Ruoli:</span>{' '}
                  <span className="text-white">{selected.affected_channels}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-700/50">
                <span className="text-gray-500 block mb-1">Descrizione:</span>
                <p className="text-gray-300 whitespace-pre-wrap">{selected.description}</p>
              </div>
              {selected.fix_notes && (
                <div className="pt-2 border-t border-gray-700/50">
                  <span className="text-gray-500 block mb-1">Note fix:</span>
                  <p className="text-green-300 whitespace-pre-wrap">{selected.fix_notes}</p>
                </div>
              )}
              {selected.fix_commit && (
                <div>
                  <span className="text-gray-500">Commit:</span>{' '}
                  <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">{selected.fix_commit}</code>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-t border-gray-700/50">
              <p className="text-xs text-gray-500 mb-2">Cambia stato:</p>
              <div className="flex flex-wrap gap-2">
                {selected.status !== 'approved' && (
                  <button
                    onClick={() => changeStatus(selected.id, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 text-xs font-medium"
                  >
                    Approva
                  </button>
                )}
                {selected.status !== 'in_progress' && (
                  <button
                    onClick={() => changeStatus(selected.id, 'in_progress')}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-medium"
                  >
                    In Lavorazione
                  </button>
                )}
                {selected.status !== 'resolved' && (
                  <button
                    onClick={() => changeStatus(selected.id, 'resolved')}
                    className="px-3 py-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-xs font-medium"
                  >
                    Risolto
                  </button>
                )}
                {selected.status !== 'closed' && (
                  <button
                    onClick={() => changeStatus(selected.id, 'closed')}
                    className="px-3 py-1.5 rounded-lg bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 text-xs font-medium"
                  >
                    Chiudi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
