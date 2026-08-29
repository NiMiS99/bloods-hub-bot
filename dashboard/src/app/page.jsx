'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Swords, Users, MessageSquare, Mic, Gamepad2, CalendarDays,
  Trophy, Shield, Bot, Sparkles, ArrowRight, Crown, Medal, Gift, Target as TournamentIcon
} from 'lucide-react';
import SiteShell from '@/components/site/SiteShell';
import Reveal from '@/components/site/Reveal';
import DiscordWidget from '@/components/site/DiscordWidget';
import { siteConfig, fetchPublic, formatNumber, formatEventDate } from '@/lib/siteConfig';

const FEATURES = [
  {
    icon: Swords,
    title: 'Raid & Progress',
    text: 'Roster mitico, loot con Bloods Points, tracking presenze e Warcraft Logs. Raid Mer+Gio 21:00-24:00. Soft-progress: serio ma senza flame.',
  },
  {
    icon: Gamepad2,
    title: 'Community 360°',
    text: 'M+, PvP (RBG/arena), social, alt, eventi cross-game. DayZ con server privato, Metin2, LoL. Tag @Social per chi vuole giocare senza obblighi di roster.',
  },
  {
    icon: Bot,
    title: 'Bloods Hub Bot',
    text: '73 comandi slash: XP, BP/DKP, loot roll, raid management, moderazione, music, giveaway, social stats e pannelli self-service.',
  },
  {
    icon: Shield,
    title: 'Mentorship & Onboarding',
    text: 'Colloquio standardizzato, mentor 1-to-1, progressione chiara: Membro → Raider → Raider Mitico. Se sei nabbo ti insegniamo. Nessuno lasciato indietro.',
  },
];

export default function Home() {
  const [info, setInfo] = useState(null);
  const [top, setTop] = useState([]);
  const [events, setEvents] = useState([]);
  const [giveaways, setGiveaways] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    fetchPublic('/info').then(setInfo).catch(() => {});
    fetchPublic('/leaderboard?metric=xp').then((d) => setTop(d.entries.slice(0, 5))).catch(() => {});
    fetchPublic('/events').then((d) => setEvents(d.events.slice(0, 3))).catch(() => {});
    fetchPublic('/giveaways').then((d) => setGiveaways(d.giveaways)).catch(() => {});
    fetchPublic('/tournaments').then((d) => setTournaments(d.tournaments)).catch(() => {});
  }, []);

  const stats = [
    { icon: Users, label: 'Membri Discord', value: info?.memberCount },
    { icon: MessageSquare, label: 'Messaggi totali', value: info?.stats?.totalMessages },
    { icon: Mic, label: 'Ore in vocale', value: info?.stats?.totalVoiceHours },
    { icon: CalendarDays, label: 'Eventi attivi', value: info?.stats?.events },
  ];

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden hero-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-bloods-950/50 via-dark-950/80 to-dark-950" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[60rem] rounded-full bg-bloods-800/25 blur-3xl animate-pulse-glow" />
        <div className="absolute top-40 -left-32 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl animate-float" />
        <div className="absolute top-40 -right-32 h-72 w-72 rounded-full bg-bloods-600/15 blur-3xl animate-float" style={{ animationDelay: '2s' }} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.35em] text-gold-400 animate-fade-in">
            {siteConfig.tagline}
          </p>
          <img
            src="/logo.png"
            alt="Logo Bloods"
            className="mx-auto mt-8 h-44 w-44 sm:h-56 sm:w-56 drop-shadow-[0_10px_40px_rgba(139,0,0,0.45)] animate-scale-in"
          />
          <h1 className="mt-8 text-5xl sm:text-7xl font-extrabold tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-bloods-400 via-bloods-500 to-bloods-700 bg-clip-text text-transparent">
              BLOODS
            </span>
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-lg text-dark-300 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            {siteConfig.description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5 animate-pulse-glow"
            >
              Unisciti su Discord <ArrowRight size={18} />
            </a>
            <Link
              href="/unisciti"
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-8 py-3.5 font-semibold text-gold-300 transition-colors hover:bg-gold-500/20"
            >
              Reclutamento
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <Reveal className="relative border-y border-dark-800 bg-dark-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center">
                  <Icon className="mx-auto mb-3 text-gold-400" size={26} />
                  <p className="text-3xl font-extrabold text-white">
                    {s.value != null ? formatNumber(s.value) : '—'}
                  </p>
                  <p className="mt-1 text-sm text-dark-400">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* FEATURES */}
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Perché Bloods?</h2>
          <p className="mt-3 text-dark-300 max-w-xl mx-auto">
            Una gilda costruita dai giocatori per i giocatori, con strumenti professionali e una community che non dorme mai.
          </p>
          <div className="mt-6 mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-dark-800 bg-dark-900/60 p-6 transition-all hover:border-bloods-800 hover:bg-dark-900"
              >
                <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-bloods-800 to-bloods-950 p-3 text-white shadow-lg shadow-bloods-900/30">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-dark-300 leading-relaxed">{f.text}</p>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* EVENTS + LEADERBOARD */}
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Prossimi eventi */}
          <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white inline-flex items-center gap-2">
                <CalendarDays className="text-gold-400" size={24} /> Prossimi eventi
              </h2>
              <Link href="/eventi" className="text-sm text-gold-400 hover:text-gold-300 inline-flex items-center gap-1">
                Tutti <ArrowRight size={14} />
              </Link>
            </div>
            {events.length === 0 ? (
              <p className="text-dark-400 text-sm">Nessun evento in programma al momento. Torna presto!</p>
            ) : (
              <ul className="space-y-4">
                {events.map((e) => (
                  <li key={e.id} className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 hover:border-dark-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{e.name}</p>
                        <p className="mt-1 text-xs text-dark-400 capitalize">{formatEventDate(e.scheduledAt)}</p>
                      </div>
                      {e.game && (
                        <span className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800 shrink-0">{e.game.name}</span>
                      )}
                    </div>
                    {e.description && <p className="mt-2 text-sm text-dark-300 line-clamp-2">{e.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Top 5 */}
          <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white inline-flex items-center gap-2">
                <Trophy className="text-gold-400" size={24} /> Top giocatori
              </h2>
              <Link href="/classifiche" className="text-sm text-gold-400 hover:text-gold-300 inline-flex items-center gap-1">
                Classifica <ArrowRight size={14} />
              </Link>
            </div>
            {top.length === 0 ? (
              <p className="text-dark-400 text-sm">Classifica non disponibile.</p>
            ) : (
              <ul className="space-y-3">
                {top.map((p) => (
                  <li key={p.rank} className="flex items-center gap-4 rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                    <span
                      className={
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ' +
                        (p.rank === 1
                          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/50'
                          : p.rank <= 3
                            ? 'bg-dark-800 text-dark-200 border border-dark-700'
                            : 'text-dark-400')
                      }
                    >
                      {p.rank === 1 ? <Crown size={16} /> : p.rank <= 3 ? <Medal size={16} /> : p.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{p.username}</p>
                      <p className="text-xs text-dark-400">Livello {p.level}</p>
                    </div>
                    <span className="text-sm font-semibold text-gold-300">{formatNumber(p.value)} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Reveal>

      {/* GIVEAWAYS & TOURNAMENTS */}
      {(giveaways.length > 0 || tournaments.length > 0) && (
        <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid gap-8 lg:grid-cols-2">
            {giveaways.length > 0 && (
              <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-white mb-6 inline-flex items-center gap-2">
                  <Gift className="text-gold-400" size={24} /> Giveaway attivi
                </h2>
                <ul className="space-y-4">
                  {giveaways.map((g) => {
                    const endsAt = new Date(g.endsAt);
                    const now = new Date();
                    const hoursLeft = Math.max(0, Math.round((endsAt - now) / 3600000));
                    return (
                      <li key={g.id} className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{g.title}</p>
                            <p className="mt-1 text-sm text-dark-300">Premio: <span className="text-gold-300 font-medium">{g.prize}</span></p>
                          </div>
                          <span className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800 shrink-0">
                            {hoursLeft > 24 ? `${Math.round(hoursLeft / 24)}gg` : `${hoursLeft}h`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {tournaments.length > 0 && (
              <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-white mb-6 inline-flex items-center gap-2">
                  <TournamentIcon className="text-gold-400" size={24} /> Tornei in corso
                </h2>
                <ul className="space-y-4">
                  {tournaments.map((t) => (
                    <li key={t.id} className="rounded-xl border border-dark-800 bg-dark-950/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{t.name}</p>
                          <p className="mt-1 text-sm text-dark-300">{t.game} · {t.format}</p>
                        </div>
                        <span className="badge bg-gold-500/15 text-gold-300 border border-gold-500/40 shrink-0">
                          {t.participantCount}/{t.maxParticipants}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* DISCORD WIDGET + HALL OF FAME LINK */}
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid gap-8 lg:grid-cols-2">
          <DiscordWidget />
          <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 flex flex-col justify-center">
            <Trophy className="text-gold-400 mb-4" size={32} />
            <h2 className="text-2xl font-bold text-white mb-2">Hall of Fame</h2>
            <p className="text-dark-300 text-sm mb-6">
              Scopri i leggendari della gilda: top BP, presenze raid, loot vinti e boss sconfitti.
            </p>
            <Link
              href="/hall-of-fame"
              className="inline-flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-6 py-3 font-semibold text-gold-300 transition-colors hover:bg-gold-500/20 w-fit"
            >
              Esplora <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Reveal>

      {/* CTA */}
      <Reveal className="relative overflow-hidden border-t border-dark-800">
        <div className="absolute inset-0 bg-gradient-to-r from-bloods-950/80 via-dark-900 to-bloods-950/80" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Sparkles className="mx-auto mb-5 text-gold-400" size={32} />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Il tuo posto nei Bloods ti aspetta</h2>
          <p className="mt-4 text-dark-300 max-w-xl mx-auto">
            Cerchiamo player per roster mitico, M+, PvP e social. Apri un ticket su Discord e inizia il tuo percorso!
          </p>
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
          >
            Entra in gilda <ArrowRight size={18} />
          </a>
        </div>
      </Reveal>
    </SiteShell>
  );
}
