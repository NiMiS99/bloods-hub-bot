'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy, MessageSquare, Mic, Award, CalendarDays, Clock, Users,
  LayoutDashboard, LogIn, CheckCircle2, XCircle, Zap, Coins, Swords,
  Shield, AlertCircle, Heart
} from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { formatNumber, formatEventDate } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

async function fetchJSON(path, options) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) throw Object.assign(new Error('API'), { status: res.status });
  return res.json();
}

export default function AreaPage() {
  const [state, setState] = useState('loading'); // loading | ready | unauth | nomember
  const [guild, setGuild] = useState(null);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [bpData, setBpData] = useState(null);
  const [raidData, setRaidData] = useState(null);
  const [busyEvent, setBusyEvent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { guilds } = await fetchJSON('/api/auth/guilds');
        if (!guilds.length) return setState('nomember');
        const g = guilds[0];
        setGuild(g);
        const [p, ev, bp, raid] = await Promise.all([
          fetchJSON(`/api/guilds/${g.id}/me/profile`),
          fetchJSON(`/api/guilds/${g.id}/me/events`),
          fetchJSON(`/api/guilds/${g.id}/me/bp`).catch(() => null),
          fetchJSON(`/api/guilds/${g.id}/me/raid`).catch(() => null),
        ]);
        setProfile(p);
        setEvents(ev.events);
        setBpData(bp);
        setRaidData(raid);
        setState('ready');
      } catch (err) {
        setState(err.status === 401 ? 'unauth' : 'nomember');
      }
    })();
  }, []);

  async function toggleEvent(ev) {
    setBusyEvent(ev.id);
    try {
      await fetchJSON(`/api/guilds/${guild.id}/me/events/${ev.id}/${ev.joined ? 'leave' : 'join'}`, { method: 'POST' });
      setEvents((list) =>
        list.map((e) =>
          e.id === ev.id
            ? { ...e, joined: !e.joined, participantCount: e.participantCount + (e.joined ? -1 : 1) }
            : e
        )
      );
    } catch {
      // ignora: stato già coerente lato server
    } finally {
      setBusyEvent(null);
    }
  }

  if (state === 'loading') {
    return (
      <SiteShell>
        <div className="flex h-[60vh] items-center justify-center"><div className="spinner" /></div>
      </SiteShell>
    );
  }

  if (state === 'unauth') {
    return (
      <SiteShell>
        <PageHeader title="Area personale" subtitle="Accedi con il tuo account Discord per vedere il tuo profilo di gilda." />
        <div className="mx-auto max-w-md px-4 pb-24 text-center">
          <a
            href="/api/auth/discord?next=/area"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
          >
            <LogIn size={18} /> Accedi con Discord
          </a>
        </div>
      </SiteShell>
    );
  }

  if (state === 'nomember') {
    return (
      <SiteShell>
        <PageHeader title="Area personale" subtitle="Non risulti membro del server Discord della gilda." />
        <div className="mx-auto max-w-md px-4 pb-24 text-center">
          <Link href="/unisciti" className="inline-flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-8 py-3.5 font-semibold text-gold-300 hover:bg-gold-500/20">
            Scopri come unirti
          </Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader title={`Ciao, ${profile.displayName}`} subtitle={`Il tuo profilo nella gilda ${guild.name}`} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-8">
        {/* Profilo */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <img src={profile.avatar} alt="" className="h-24 w-24 rounded-2xl border-2 border-gold-500/50 shadow-lg" />
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <h2 className="text-2xl font-extrabold text-white">{profile.displayName}</h2>
                <span className="badge bg-gold-500/15 text-gold-300 border border-gold-500/40 mx-auto sm:mx-0">
                  <Trophy size={12} /> Rank #{profile.rank}
                </span>
                {profile.isAdmin && (
                  <span className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800 mx-auto sm:mx-0">Staff</span>
                )}
              </div>
              <p className="mt-1 text-sm text-dark-400">@{profile.username}</p>

              {/* XP progress */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-dark-400 mb-1.5">
                  <span className="inline-flex items-center gap-1"><Zap size={12} className="text-gold-400" /> Livello {profile.level}</span>
                  <span>{formatNumber(profile.xp)} / {formatNumber(profile.xpForNext)} XP</span>
                </div>
                <div className="h-3 rounded-full bg-dark-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-bloods-700 via-bloods-500 to-gold-400 transition-all"
                    style={{ width: `${profile.progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-dark-500">{profile.progressPct}% verso il livello {profile.level + 1}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <Zap className="mx-auto mb-2 text-gold-400" size={20} />
              <p className="text-xl font-bold text-white">{formatNumber(profile.xp)}</p>
              <p className="text-xs text-dark-400">XP totali</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <MessageSquare className="mx-auto mb-2 text-gold-400" size={20} />
              <p className="text-xl font-bold text-white">{formatNumber(profile.totalMessages)}</p>
              <p className="text-xs text-dark-400">Messaggi</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <Mic className="mx-auto mb-2 text-gold-400" size={20} />
              <p className="text-xl font-bold text-white">{formatNumber(Math.round(profile.totalVoiceSeconds / 3600))} h</p>
              <p className="text-xs text-dark-400">In vocale</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <Award className="mx-auto mb-2 text-gold-400" size={20} />
              <p className="text-xl font-bold text-white">{profile.badges.length}</p>
              <p className="text-xs text-dark-400">Badge</p>
            </div>
          </div>

          {/* Ruoli + Badge */}
          {(profile.roles.length > 0 || profile.badges.length > 0) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {profile.roles.map((r) => (
                <span key={r.id} className="badge border border-dark-700 bg-dark-800/60" style={{ color: r.color !== '#000000' ? r.color : undefined }}>
                  {r.name}
                </span>
              ))}
              {profile.badges.map((b) => (
                <span key={b.code} className="badge bg-gold-500/10 text-gold-300 border border-gold-500/40">
                  <Award size={12} /> {b.code}
                </span>
              ))}
            </div>
          )}

          {profile.isMod && (
            <div className="mt-6 pt-6 border-t border-dark-800">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-bloods-900/40 transition-transform hover:-translate-y-0.5"
              >
                <LayoutDashboard size={16} /> Apri la dashboard staff
              </Link>
            </div>
          )}
        </section>

        {/* Eventi con iscrizione */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
            <CalendarDays className="text-gold-400" size={22} /> Iscrizioni eventi
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-dark-400">Nessun evento in programma. Quando lo staff creerà un evento potrai iscriverti da qui.</p>
          ) : (
            <ul className="space-y-4">
              {events.map((e) => (
                <li key={e.id} className="rounded-xl border border-dark-800 bg-dark-950/60 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-white">{e.name}</p>
                        {e.game && (
                          <span className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800">{e.game.name}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
                        <span className="inline-flex items-center gap-1 capitalize"><CalendarDays size={12} /> {formatEventDate(e.scheduledAt)}</span>
                        {e.durationMinutes && <span className="inline-flex items-center gap-1"><Clock size={12} /> {e.durationMinutes} min</span>}
                        <span className="inline-flex items-center gap-1"><Users size={12} /> {e.participantCount} iscritti</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleEvent(e)}
                      disabled={busyEvent === e.id}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50',
                        e.joined
                          ? 'border border-dark-600 text-dark-200 hover:border-bloods-700 hover:text-bloods-300'
                          : 'bg-gradient-to-r from-bloods-800 to-bloods-600 text-white shadow-lg shadow-bloods-900/40 hover:-translate-y-0.5'
                      )}
                    >
                      {e.joined ? <><XCircle size={16} /> Annulla</> : <><CheckCircle2 size={16} /> Iscriviti</>}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* BP / DKP */}
        {bpData && (
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Coins className="text-gold-400" size={22} /> Bloods Points (DKP)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Coins className="mx-auto mb-2 text-gold-400" size={20} />
                <p className="text-2xl font-extrabold text-white">{formatNumber(bpData.dkp)}</p>
                <p className="text-xs text-dark-400">Saldo BP</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Trophy className="mx-auto mb-2 text-gold-400" size={20} />
                <p className="text-2xl font-extrabold text-white">#{bpData.rank}</p>
                <p className="text-xs text-dark-400">Posizione</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Award className="mx-auto mb-2 text-gold-400" size={20} />
                <p className="text-2xl font-extrabold text-white">{bpData.recentLoot.length}</p>
                <p className="text-xs text-dark-400">Loot vinti</p>
              </div>
            </div>
            {bpData.recentLoot.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-dark-300 mb-3">Loot recente</p>
                <ul className="space-y-2">
                  {bpData.recentLoot.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 rounded-lg border border-dark-800 bg-dark-950/40 px-4 py-2.5">
                      <Swords size={14} className="text-bloods-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{l.itemName}</p>
                        {l.boss && <p className="text-xs text-dark-500">{l.boss}</p>}
                      </div>
                      <span className="text-xs text-dark-400 shrink-0">
                        {l.bid} BP · roll {l.roll}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Raid Eligibility */}
        {raidData && raidData.configured && (
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Swords className="text-gold-400" size={22} /> Stato raid
            </h2>

            {/* Eligibility status */}
            {raidData.eligibility ? (
              <div className={cn(
                'rounded-xl border p-5 mb-6',
                raidData.eligibility.isEligible
                  ? 'border-green-700/50 bg-green-900/15'
                  : 'border-bloods-800/50 bg-bloods-950/20'
              )}>
                <div className="flex items-center gap-3 mb-3">
                  {raidData.eligibility.isEligible ? (
                    <CheckCircle2 className="text-green-500" size={24} />
                  ) : (
                    <XCircle className="text-bloods-500" size={24} />
                  )}
                  <div>
                    <p className={cn('font-bold', raidData.eligibility.isEligible ? 'text-green-400' : 'text-bloods-400')}>
                      {raidData.eligibility.isEligible ? 'Eleggibile per il raid' : 'Non eleggibile'}
                    </p>
                    {raidData.eligibility.characterName && (
                      <p className="text-sm text-dark-400">
                        {raidData.eligibility.characterName}
                        {raidData.eligibility.characterClass && ` — ${raidData.eligibility.characterClass}`}
                      </p>
                    )}
                  </div>
                </div>
                {!raidData.eligibility.isEligible && raidData.eligibility.failureReasons.length > 0 && (
                  <ul className="space-y-1.5 mt-3">
                    {raidData.eligibility.failureReasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                        <AlertCircle size={14} className="text-bloods-400 shrink-0 mt-0.5" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-5 mb-6">
                <p className="text-sm text-dark-400">
                  Nessuno snapshot di eligibilità trovato. Usa <code className="text-gold-300">/raidstatus</code> su Discord per verificare.
                </p>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {raidData.eligibility && (
                <>
                  <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                    <Shield className="mx-auto mb-2 text-gold-400" size={18} />
                    <p className="text-lg font-bold text-white">{raidData.eligibility.ilvlAvg || '—'}</p>
                    <p className="text-xs text-dark-400">iLvl medio</p>
                  </div>
                  <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                    <Heart className="mx-auto mb-2 text-gold-400" size={18} />
                    <p className="text-lg font-bold text-white">
                      {raidData.eligibility.hasTierBonus ? `${raidData.eligibility.tierBonusCount || 1}pz` : 'No'}
                    </p>
                    <p className="text-xs text-dark-400">Tier bonus</p>
                  </div>
                </>
              )}
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <CalendarDays className="mx-auto mb-2 text-gold-400" size={18} />
                <p className="text-lg font-bold text-white">{raidData.attendance.attendedLast30}</p>
                <p className="text-xs text-dark-400">Presenze (30gg)</p>
              </div>
              <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
                <Trophy className="mx-auto mb-2 text-gold-400" size={18} />
                <p className="text-lg font-bold text-white">{raidData.attendance.attendancePct}%</p>
                <p className="text-xs text-dark-400">Attendance</p>
              </div>
            </div>

            {/* Requirements reminder */}
            {raidData.requirements && (
              <div className="mt-6 pt-6 border-t border-dark-800">
                <p className="text-xs text-dark-400 mb-3">Requisiti attuali: iLvl {raidData.requirements.minIlvl} · Presenza {raidData.requirements.minAttendance}%{raidData.requirements.requireTierBonus ? ' · Tier bonus richiesto' : ''}{raidData.requirements.requireAchievement ? ` · Achievement: ${raidData.requirements.requireAchievement}` : ''}</p>
              </div>
            )}
          </section>
        )}
      </div>
    </SiteShell>
  );
}
