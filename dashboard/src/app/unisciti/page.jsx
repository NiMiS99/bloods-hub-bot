'use client';

import {
  UserPlus, MessageCircle, ScrollText, Swords, HeartHandshake,
  CheckCircle2, ArrowRight, Shield, Sparkles, CalendarDays
} from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig } from '@/lib/siteConfig';

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Entra nel Discord',
    text: 'Clicca sul link d\'invito e accedi al server Bloods. Il bot ti assegna @Guest e ti invita ad aprire un ticket.',
  },
  {
    icon: ScrollText,
    title: 'Apri un ticket',
    text: 'Usa il canale #apri-ticket e scegli: Reclutamento Raider, Reclutamento PvP, Reclutamento Social o Supporto.',
  },
  {
    icon: UserPlus,
    title: 'Colloquio (10 min)',
    text: 'Un Officer ti fa un breve colloquio: esperienza, ruolo, disponibilità, obiettivi. Al termine ti assegna il tag giusto (@Raider, @PvP, @Social).',
  },
  {
    icon: Swords,
    title: 'Inizia a giocare',
    text: 'Nickname normalizzato, presentazione in #presentazioni, mentor assegnato se vuoi salire al roster raid. Benvenuto nei Bloods!',
  },
];

const SEEKING = [
  { role: 'Tank (2-3)', desc: 'Main + off-tank per roster mitico' },
  { role: 'Healer (4-5)', desc: 'Main + off per roster mitico' },
  { role: 'DPS (12-14)', desc: 'Melee/ranged bilanciati per mitico' },
  { role: 'PvP Player', desc: 'RBG 1800+ e arena 2v2/3v3' },
  { role: 'Social / Returning', desc: 'M+, eventi, alt, community. Senza obblighi roster' },
];

const VALUES = [
  'Soft-progress: impegno costante nei raid, ma senza obblighi assurdi. La vita reale viene prima.',
  'Rispetto reciproco sempre obbligatorio: zero flame, zero tossicità (regolamento v3.0).',
  'Discord + microfono obbligatori per tutte le attività di gilda.',
  'Sistema loot trasparente con Bloods Points (bot Discord).',
  'Mentorship 1-to-1: @Social può salire a Raider con supporto dedicato.',
  'Policy "no silent kick": contatto personale prima di qualsiasi rimozione per inattività.',
];

export default function UniscitiPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Unisciti ai Bloods"
        subtitle={`Reclutamento aperto — ${siteConfig.realm} (${siteConfig.region}) · ${siteConfig.faction}`}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-16">
        {/* Schedule */}
        <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
            <CalendarDays className="text-gold-400" size={22} /> Schedule settimanale
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-bloods-300">Raid Mitico</p>
              <p className="mt-1 text-xs text-dark-400">{siteConfig.schedule.mythic}</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-gold-300">Raid Social/Alt</p>
              <p className="mt-1 text-xs text-dark-400">{siteConfig.schedule.social}</p>
            </div>
            <div className="rounded-xl border border-dark-800 bg-dark-950/60 p-4 text-center">
              <p className="text-sm font-bold text-blue-300">PvP Night</p>
              <p className="mt-1 text-xs text-dark-400">{siteConfig.schedule.pvp}</p>
            </div>
          </div>
        </section>
        {/* Steps */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Come entrare</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="relative rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                  <span className="absolute -top-3 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-sm font-bold text-dark-950 shadow-lg">
                    {i + 1}
                  </span>
                  <Icon className="mb-4 text-gold-400" size={26} />
                  <h3 className="font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm text-dark-300 leading-relaxed">{s.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Chi cerchiamo */}
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <Shield className="text-gold-400" size={22} /> Chi stiamo cercando
            </h2>
            <ul className="space-y-4">
              {SEEKING.map((r) => (
                <li key={r.role} className="flex items-center justify-between rounded-xl border border-dark-800 bg-dark-950/60 px-4 py-3">
                  <span className="font-semibold text-white">{r.role}</span>
                  <span className="text-sm text-dark-400">{r.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* I nostri valori */}
          <section className="rounded-2xl border border-dark-800 bg-dark-900/60 p-8">
            <h2 className="text-xl font-bold text-white mb-6 inline-flex items-center gap-2">
              <HeartHandshake className="text-gold-400" size={22} /> I nostri valori
            </h2>
            <ul className="space-y-4">
              {VALUES.map((v) => (
                <li key={v} className="flex items-start gap-3 text-sm text-dark-200">
                  <CheckCircle2 size={18} className="text-bloods-500 shrink-0 mt-0.5" />
                  {v}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* CTA finale */}
        <section className="relative overflow-hidden rounded-3xl border border-bloods-900 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-bloods-950 via-dark-900 to-bloods-950" />
          <div className="relative px-6 py-14">
            <Sparkles className="mx-auto mb-4 text-gold-400" size={30} />
            <h2 className="text-3xl font-extrabold text-white">Pronto a scrivere la tua leggenda?</h2>
            <p className="mt-3 text-dark-300 max-w-lg mx-auto">
              Un click ti separa dalla tua nuova gilda. Ti aspettiamo in game.
            </p>
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
            >
              Unisciti su Discord <ArrowRight size={18} />
            </a>
            <p className="mt-4 text-xs text-dark-400">
              Puoi anche candidarti tramite{' '}
              <a
                href="https://guildsofwow.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-bloods-400 hover:text-bloods-300 underline"
              >
                Guilds of WoW
              </a>
            </p>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
