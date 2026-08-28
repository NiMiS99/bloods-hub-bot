'use client';

import {
  UserPlus, MessageCircle, ScrollText, Swords, HeartHandshake,
  CheckCircle2, ArrowRight, Shield, Sparkles
} from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig } from '@/lib/siteConfig';

const STEPS = [
  {
    icon: MessageCircle,
    title: 'Entra nel Discord',
    text: 'Clicca sul link d\'invito e accedi al server Bloods. Leggi il canale regole e accettale per sbloccare i canali.',
  },
  {
    icon: ScrollText,
    title: 'Presentati',
    text: 'Scrivi nel canale presentazioni: classe, ruolo, esperienza di gioco e cosa cerchi dalla gilda.',
  },
  {
    icon: UserPlus,
    title: 'Parla con un officer',
    text: 'Un officer ti contatterà per una breve chiacchierata e ti assegnerà i ruoli giusti tramite il pannello del bot.',
  },
  {
    icon: Swords,
    title: 'Firma per il primo raid',
    text: 'Usa i pannelli di sign-up del bot per iscriverti al prossimo raid o alla prossima serata mitiche+.',
  },
];

const SEEKING = [
  { role: 'Healer', desc: 'Priorità alta per il roster raid' },
  { role: 'Tank', desc: 'Posti limitati, esperienza richiesta' },
  { role: 'DPS Ranged', desc: 'Sempre benvenuti' },
  { role: 'DPS Melee', desc: 'Sempre benvenuti' },
];

const VALUES = [
  'Rispetto e zero tossicità: si gioca per divertirsi insieme.',
  'Presenza ai raid confermata tramite i pannelli del bot.',
  'Aiutare i nuovi membri è parte del DNA della gilda.',
  'Progress sereno: niente obblighi assurdi, ma impegno costante.',
];

export default function UniscitiPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Unisciti ai Bloods"
        subtitle={`Reclutamento aperto — ${siteConfig.realm} (${siteConfig.region}) · ${siteConfig.faction}`}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-16">
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
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
