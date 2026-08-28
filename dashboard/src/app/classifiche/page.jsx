'use client';

import { useEffect, useState } from 'react';
import { Crown, Medal, Trophy, Zap, MessageSquare, Mic, Coins } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { fetchPublic, formatNumber } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

const METRICS = [
  { key: 'xp', label: 'XP', icon: Zap, format: (v) => `${formatNumber(v)} XP` },
  { key: 'messages', label: 'Messaggi', icon: MessageSquare, format: (v) => formatNumber(v) },
  { key: 'voice', label: 'Ore vocali', icon: Mic, format: (v) => `${formatNumber(Math.round(v / 3600))} h` },
  { key: 'bp', label: 'BP / DKP', icon: Coins, format: (v) => `${formatNumber(v)} BP` },
];

export default function ClassifichePage() {
  const [metric, setMetric] = useState('xp');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (metric === 'bp') {
      fetchPublic('/bp/leaderboard')
        .then((d) => setEntries(d.entries.map((e) => ({ rank: e.rank, username: e.username, level: null, value: e.dkp }))))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    } else {
      fetchPublic(`/leaderboard?metric=${metric}`)
        .then((d) => setEntries(d.entries))
        .catch(() => setEntries([]))
        .finally(() => setLoading(false));
    }
  }, [metric]);

  const active = METRICS.find((m) => m.key === metric);

  return (
    <SiteShell>
      <PageHeader
        title="Classifiche"
        subtitle="I membri più attivi della community Bloods, aggiornati in tempo reale dal bot."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex justify-center gap-2 mb-10">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all border',
                  metric === m.key
                    ? 'bg-gradient-to-r from-bloods-800 to-bloods-600 text-white border-transparent shadow-lg shadow-bloods-900/40'
                    : 'border-dark-700 text-dark-300 hover:text-white hover:border-dark-600'
                )}
              >
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : entries.length === 0 ? (
          <p className="text-center text-dark-400 py-16">Classifica non disponibile al momento.</p>
        ) : (
          <div className="space-y-3">
            {entries.map((p) => (
              <div
                key={p.rank}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border px-5 py-4 transition-colors',
                  p.rank === 1
                    ? 'border-gold-500/50 bg-gradient-to-r from-gold-500/10 to-transparent'
                    : 'border-dark-800 bg-dark-900/60 hover:border-dark-700'
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-lg',
                    p.rank === 1 && 'bg-gold-500/20 text-gold-300 border border-gold-500/60',
                    p.rank === 2 && 'bg-dark-700 text-dark-100 border border-dark-500',
                    p.rank === 3 && 'bg-amber-900/40 text-amber-400 border border-amber-800',
                    p.rank > 3 && 'text-dark-400'
                  )}
                >
                  {p.rank === 1 ? <Crown size={20} /> : p.rank <= 3 ? <Medal size={20} /> : p.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{p.username}</p>
                  <p className="text-xs text-dark-400">Livello {p.level}</p>
                </div>
                <span className="text-base font-bold text-gold-300">{active.format(p.value)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-dark-500 inline-flex items-center gap-1 justify-center w-full">
          <Trophy size={12} /> Dati forniti dal Bloods Hub Bot — aggiornati ogni minuto.
        </p>
      </div>
    </SiteShell>
  );
}
