'use client';

import { useEffect, useState } from 'react';
import {
  Swords, Clock, Shield, CheckCircle2, XCircle, Users,
  CalendarDays, AlertCircle, ChevronRight, Skull
} from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig, fetchPublic, formatNumber } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

export default function RaidPage() {
  const [raid, setRaid] = useState(null);
  const [bpLoot, setBpLoot] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchPublic('/raid').catch(() => null),
      fetchPublic('/bp/loot').catch(() => ({ entries: [] })),
    ]).then(([r, l]) => {
      setRaid(r);
      setBpLoot(l?.entries || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <SiteShell>
        <PageHeader title="Raid & Progress" subtitle="Schedule, requisiti e roster della gilda Bloods." />
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      </SiteShell>
    );
  }

  if (!raid || !raid.configured) {
    return (
      <SiteShell>
        <PageHeader title="Raid & Progress" subtitle="Schedule, requisiti e roster della gilda Bloods." />
        <div className="mx-auto max-w-2xl px-4 pb-24 text-center">
          <AlertCircle className="mx-auto mb-4 text-dark-500" size={48} />
          <p className="text-dark-300 font-medium text-lg">Configurazione raid non disponibile</p>
          <p className="mt-2 text-sm text-dark-400">
            Lo staff non ha ancora configurato i raid tramite il bot. Usa il comando <code className="text-gold-300">/raidreq</code> su Discord per impostare requisiti e schedule.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader title="Raid & Progress" subtitle={`${raid.raidName} — ${siteConfig.realm} (${siteConfig.region})`} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-8">
        {/* Schedule & Stats */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Schedule */}
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <CalendarDays className="text-gold-400" size={22} /> Schedule
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                <span className="text-sm text-dark-300 inline-flex items-center gap-2">
                  <CalendarDays size={16} className="text-gold-400" /> Giorni
                </span>
                <div className="flex flex-wrap gap-2 justify-end">
                  {raid.raidDays.map((d) => (
                    <span key={d} className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                <span className="text-sm text-dark-300 inline-flex items-center gap-2">
                  <Clock size={16} className="text-gold-400" /> Orario
                </span>
                <span className="font-semibold text-white">{raid.raidTime} server time</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                <span className="text-sm text-dark-300 inline-flex items-center gap-2">
                  <Swords size={16} className="text-gold-400" /> Raid
                </span>
                <span className="font-semibold text-white">{raid.raidName}</span>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Users className="text-gold-400" size={22} /> Statistiche
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-green-500" size={24} />
                <p className="text-2xl font-extrabold text-white">{raid.stats.eligibleCount}</p>
                <p className="text-xs text-dark-400">Eleggibili</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Users className="mx-auto mb-2 text-gold-400" size={24} />
                <p className="text-2xl font-extrabold text-white">{raid.stats.totalChecked}</p>
                <p className="text-xs text-dark-400">Controllati</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Swords className="mx-auto mb-2 text-bloods-400" size={24} />
                <p className="text-2xl font-extrabold text-white">{raid.stats.uniqueRaidSessions}</p>
                <p className="text-xs text-dark-400">Sessioni (30gg)</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Skull className="mx-auto mb-2 text-dark-300" size={24} />
                <p className="text-2xl font-extrabold text-white">{raid.stats.raidNames.length}</p>
                <p className="text-xs text-dark-400">Raid diversi</p>
              </div>
            </div>
          </section>
        </div>

        {/* Requirements */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
            <Shield className="text-gold-400" size={22} /> Requisiti di raid
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Item Level min</p>
              <p className="text-2xl font-bold text-gold-300">{raid.requirements.minIlvl}</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Presenza min</p>
              <p className="text-2xl font-bold text-gold-300">{raid.requirements.minAttendance}%</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Tier Bonus</p>
              <p className={cn('text-lg font-bold', raid.requirements.requireTierBonus ? 'text-green-400' : 'text-dark-400')}>
                {raid.requirements.requireTierBonus ? 'Richiesto' : 'Non richiesto'}
              </p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Achievement</p>
              <p className={cn('text-sm font-bold truncate', raid.requirements.requireAchievement ? 'text-green-400' : 'text-dark-400')}>
                {raid.requirements.requireAchievement || 'Non richiesto'}
              </p>
            </div>
          </div>
        </section>

        {/* Roster Preview */}
        {raid.roster && raid.roster.length > 0 && (
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Users className="text-gold-400" size={22} /> Roster ({raid.roster.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-dark-400 border-b border-dark-800">
                    <th className="pb-3 pr-4 font-medium">Personaggio</th>
                    <th className="pb-3 pr-4 font-medium">Classe</th>
                    <th className="pb-3 pr-4 font-medium text-right">iLvl</th>
                    <th className="pb-3 font-medium text-center">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {raid.roster.map((r, i) => (
                    <tr key={i} className="border-b border-dark-800/50 hover:bg-dark-950/40">
                      <td className="py-3 pr-4 font-medium text-white">{r.character}</td>
                      <td className="py-3 pr-4 text-dark-300">{r.class || '—'}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-gold-300">{r.ilvl || '—'}</td>
                      <td className="py-3 text-center">
                        {r.eligible ? (
                          <CheckCircle2 size={18} className="inline text-green-500" />
                        ) : (
                          <XCircle size={18} className="inline text-bloods-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recent Loot */}
        {bpLoot.length > 0 && (
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Swords className="text-gold-400" size={22} /> Loot recente
            </h2>
            <ul className="space-y-3">
              {bpLoot.map((l) => (
                <li key={l.id} className="flex items-center gap-4 rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{l.itemName}</p>
                    {l.boss && <p className="text-xs text-dark-400">{l.boss}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gold-300">{l.winnerName}</p>
                    <p className="text-xs text-dark-500">{l.participants} partecipanti</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-bloods-900 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-bloods-950 via-dark-900 to-bloods-950" />
          <div className="relative px-6 py-14">
            <Swords className="mx-auto mb-4 text-gold-400" size={32} />
            <h2 className="text-3xl font-extrabold text-white">Sei pronto per il raid?</h2>
            <p className="mt-3 text-dark-300 max-w-lg mx-auto">
              Controlla la tua eligibilità con <code className="text-gold-300">/raidstatus</code> su Discord e firma per il prossimo raid.
            </p>
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
            >
              Vai al Discord <ChevronRight size={18} />
            </a>
          </div>
        </section>

        {/* Bloods Points System */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
            <Shield className="text-gold-400" size={22} /> Bloods Points (BP) System
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-sm font-bold text-gold-300 mb-2">Come si ottengono i BP</p>
              <ul className="text-xs text-dark-300 space-y-1">
                <li>• Presenza raid + puntualità (online 15 min prima)</li>
                <li>• Kill boss e first kill (progress)</li>
                <li>• Partecipazione M+ gilda</li>
                <li>• Eventi PvP gilda (RBG/arena)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-sm font-bold text-gold-300 mb-2">Come funziona il loot</p>
              <ul className="text-xs text-dark-300 space-y-1">
                <li>• Roll 1-100 + bid BP (score = roll × (1 + bid/50))</li>
                <li>• Vince lo score più alto</li>
                <li>• Il vincitore paga la bid</li>
                <li>• Saldo consultabile con <code className="text-gold-300">/bp balance</code></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Raider Mitico Progressione */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
            <Swords className="text-gold-400" size={22} /> Progressione Raider Mitico
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-dark-300">Membro / @Social</p>
              <p className="mt-1 text-xs text-dark-500">Punto di partenza</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-bloods-300">Raider</p>
              <p className="mt-1 text-xs text-dark-500">Raid heroic, 4+ sett, 60% presenza</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-gold-300">Raider Mitico</p>
              <p className="mt-1 text-xs text-dark-500">Roster 20, 75% presenza, tutti i requisiti</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs font-bold text-gold-300 mb-2">Requisiti Raider Mitico</p>
              <ul className="text-xs text-dark-400 space-y-1">
                <li>• Discord + mic obbligatori</li>
                <li>• Online 15 min prima</li>
                <li>• Consumabili: fiala, cibo, runa, pozioni, gemme, enchant</li>
                <li>• Addon: DBM/BigWigs, WA, Details</li>
                <li>• Presenza 75% (6/8 raid al mese)</li>
                <li>• M+ settimanale: key +6/+8</li>
                <li>• Warcraft Logs attivi</li>
              </ul>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
              <p className="text-xs font-bold text-gold-300 mb-2">Mentorship</p>
              <ul className="text-xs text-dark-400 space-y-1">
                <li>• @Social può salire a Raider con mentor dedicato</li>
                <li>• Raider può puntare al Mitico con supporto RL</li>
                <li>• Comunicazione trasparente sulla selezione</li>
                <li>• Piano di sviluppo personalizzato</li>
                <li>• Nessuno si sente &quot;scartato&quot;</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
