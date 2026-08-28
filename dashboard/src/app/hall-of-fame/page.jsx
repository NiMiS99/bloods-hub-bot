'use client';

import { useEffect, useState } from 'react';
import {
  Trophy, Crown, Medal, Swords, Skull, Coins,
  CheckCircle2, Calendar, ChevronRight, Filter, Search
} from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import Reveal from '@/components/site/Reveal';
import { fetchPublic, formatNumber } from '@/lib/siteConfig';

export default function HallOfFamePage() {
  const [progress, setProgress] = useState(null);
  const [hof, setHof] = useState(null);
  const [loot, setLoot] = useState({ entries: [], bosses: [], total: 0 });
  const [bossFilter, setBossFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPublic('/raid/progress').catch(() => null),
      fetchPublic('/hall-of-fame').catch(() => null),
      fetchPublic('/bp/loot/full?limit=50').catch(() => ({ entries: [], bosses: [], total: 0 })),
    ]).then(([p, h, l]) => {
      setProgress(p);
      setHof(h);
      setLoot(l || { entries: [], bosses: [], total: 0 });
      if (l && !Array.isArray(l.bosses)) l.bosses = [];
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (bossFilter) {
      fetchPublic(`/bp/loot/full?limit=50&boss=${encodeURIComponent(bossFilter)}`)
        .then((d) => setLoot(d))
        .catch(() => {});
    }
  }, [bossFilter]);

  if (loading) {
    return (
      <SiteShell>
        <PageHeader title="Hall of Fame" subtitle="I leggendari della gilda Bloods." />
        <div className="flex justify-center py-16"><div className="bloods-loader" /></div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader title="Hall of Fame" subtitle="I leggendari della gilda Bloods." />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-12">
        {/* Raid Progression */}
        {progress && progress.progression && progress.progression.length > 0 && (
          <Reveal>
            <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
                <Skull className="text-bloods-400" size={22} /> Boss sconfitti
                {progress.raidName && (
                  <span className="text-sm text-dark-400 font-normal">— {progress.raidName}</span>
                )}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {progress.progression.map((b, i) => (
                  <div key={i} className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 hover:border-bloods-800 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle2 size={18} className="text-green-500" />
                      <span className="text-xs text-dark-400">{b.lootCount} loot</span>
                    </div>
                    <p className="font-semibold text-white truncate">{b.boss}</p>
                    <p className="text-xs text-dark-500 mt-1">
                      {b.lastKill ? new Date(b.lastKill).toLocaleDateString('it-IT') : '—'}
                    </p>
                  </div>
                ))}
              </div>
              {progress.raidSessions && progress.raidSessions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-dark-800">
                  <p className="text-sm text-dark-400 mb-3">Sessioni raid (30 giorni):</p>
                  <div className="flex flex-wrap gap-3">
                    {progress.raidSessions.map((s, i) => (
                      <span key={i} className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800">
                        {s.name}: {s.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </Reveal>
        )}

        {/* Top 3 categories */}
        {hof && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top BP */}
            <Reveal delay={0}>
              <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                <h2 className="text-lg font-bold text-white mb-5 inline-flex items-center gap-2">
                  <Coins className="text-gold-400" size={20} /> Top BP
                </h2>
                {hof.topBp.length === 0 ? (
                  <p className="text-dark-400 text-sm">Nessun dato.</p>
                ) : (
                  <ul className="space-y-3">
                    {hof.topBp.slice(0, 5).map((p, i) => (
                      <li key={p.userId} className="flex items-center gap-3">
                        <span className={
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ' +
                          (i === 0 ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50' :
                           i === 1 ? 'bg-dark-700 text-dark-200 border border-dark-600' :
                           i === 2 ? 'bg-dark-800 text-dark-300 border border-dark-700' :
                           'text-dark-400')
                        }>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-white">{p.username}</span>
                        <span className="text-sm font-bold text-gold-300">{formatNumber(p.bp)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>

            {/* Top Attendance */}
            <Reveal delay={100}>
              <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                <h2 className="text-lg font-bold text-white mb-5 inline-flex items-center gap-2">
                  <Calendar className="text-gold-400" size={20} /> Top Presenze
                </h2>
                {hof.topAttendance.length === 0 ? (
                  <p className="text-dark-400 text-sm">Nessun dato.</p>
                ) : (
                  <ul className="space-y-3">
                    {hof.topAttendance.slice(0, 5).map((p, i) => (
                      <li key={p.userId} className="flex items-center gap-3">
                        <span className={
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ' +
                          (i === 0 ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50' :
                           i === 1 ? 'bg-dark-700 text-dark-200 border border-dark-600' :
                           i === 2 ? 'bg-dark-800 text-dark-300 border border-dark-700' :
                           'text-dark-400')
                        }>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-white">{p.username}</span>
                        <span className="text-sm font-bold text-gold-300">{p.attendedCount} raid</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>

            {/* Top Looters */}
            <Reveal delay={200}>
              <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                <h2 className="text-lg font-bold text-white mb-5 inline-flex items-center gap-2">
                  <Swords className="text-gold-400" size={20} /> Top Loot
                </h2>
                {hof.topLooters.length === 0 ? (
                  <p className="text-dark-400 text-sm">Nessun dato.</p>
                ) : (
                  <ul className="space-y-3">
                    {hof.topLooters.slice(0, 5).map((p, i) => (
                      <li key={p.userId} className="flex items-center gap-3">
                        <span className={
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm ' +
                          (i === 0 ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50' :
                           i === 1 ? 'bg-dark-700 text-dark-200 border border-dark-600' :
                           i === 2 ? 'bg-dark-800 text-dark-300 border border-dark-700' :
                           'text-dark-400')
                        }>
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium text-white">{p.username}</span>
                        <span className="text-sm font-bold text-gold-300">{p.lootWon} item</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          </div>
        )}

        {/* Loot Gallery */}
        <Reveal>
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h2 className="text-xl font-bold text-white inline-flex items-center gap-2">
                <Trophy className="text-gold-400" size={22} /> Galleria Loot
                <span className="text-sm text-dark-400 font-normal">({loot.total} totali)</span>
              </h2>
              {loot.bosses.length > 0 && (
                <select
                  value={bossFilter}
                  onChange={(e) => setBossFilter(e.target.value)}
                  className="rounded-lg border border-dark-800 bg-dark-950 px-3 py-2 text-sm text-white focus:border-gold-500 outline-none"
                >
                  <option value="">Tutti i boss</option>
                  {loot.bosses.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>
            {loot.entries.length === 0 ? (
              <p className="text-dark-400 text-sm">Nessun loot registrato.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-dark-400 border-b border-dark-800">
                      <th className="pb-3 pr-4 font-medium">Item</th>
                      <th className="pb-3 pr-4 font-medium">Boss</th>
                      <th className="pb-3 pr-4 font-medium">Vincitore</th>
                      <th className="pb-3 pr-4 font-medium text-right">Bid</th>
                      <th className="pb-3 font-medium text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loot.entries.map((l) => (
                      <tr key={l.id} className="border-b border-dark-800/50 hover:bg-dark-950/40">
                        <td className="py-3 pr-4 font-medium text-white">{l.itemName}</td>
                        <td className="py-3 pr-4 text-dark-300">{l.boss || '—'}</td>
                        <td className="py-3 pr-4 text-gold-300">{l.winnerName}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-white">{l.bid}</td>
                        <td className="py-3 text-right text-dark-400">
                          {l.closedAt ? new Date(l.closedAt).toLocaleDateString('it-IT') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </SiteShell>
  );
}
