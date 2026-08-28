'use client';

import { Swords, Heart, Users, Shield, Zap, Trophy, Bot, Gamepad2, Sparkles, ArrowRight } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig } from '@/lib/siteConfig';

const HISTORY = [
  { year: 'Fondazione', text: 'Bloods nasce come gilda italiana su Pozzo dell\'Eternità, con l\'obiettivo di unire progress e amicizia.' },
  { year: 'Crescita', text: 'La community si espande oltre WoW: tornei, game night e sezioni dedicate ad altri titoli.' },
  { year: 'Oggi', text: 'Una gilda strutturata con sistemi automatizzati (Bloods Hub Bot), raid organizzati e un Discord attivo 24/7.' },
];

const VALUES = [
  { icon: Heart, title: 'Rispetto', text: 'Zero tossicità. Si gioca per divertirsi insieme, non per flame.' },
  { icon: Swords, title: 'Progress', text: 'Impegno costante nei raid, ma senza obblighi assurdi. La vita reale viene prima.' },
  { icon: Users, title: 'Community', text: 'Aiutare i nuovi membri è parte del nostro DNA. Nessuno viene lasciato indietro.' },
  { icon: Shield, title: 'Organizzazione', text: 'Sistemi automatizzati, roster gestiti, presenze tracciate. Tutto trasparente.' },
];

const FEATURES = [
  { icon: Bot, title: 'Bloods Hub Bot', text: 'Bot custom con 43+ comandi: livelli XP, BP/DKP, raid management, moderazione, giveaway e altro.' },
  { icon: Swords, title: 'Raid System', text: 'Eligibilità automatica, tracking presenze, integrazione Warcraft Logs, assegnazione BP.' },
  { icon: Trophy, title: 'Classifiche', text: 'XP, messaggi, ore vocali e BP: tutto tracciato e visibile sul sito.' },
  { icon: Gamepad2, title: 'Multi-gioco', text: 'Non solo WoW: LFG, tornei e game night su tutti i titoli della community.' },
];

export default function ChiSiamoPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Chi siamo"
        subtitle={`La storia, i valori e gli strumenti della gilda Bloods — ${siteConfig.realm} (${siteConfig.region})`}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-16">
        {/* Storia */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">La nostra storia</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {HISTORY.map((h, i) => (
              <div key={i} className="relative rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                <span className="absolute -top-3 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-sm font-bold text-dark-950 shadow-lg">
                  {i + 1}
                </span>
                <h3 className="font-bold text-gold-300 mb-2">{h.year}</h3>
                <p className="text-sm text-dark-300 leading-relaxed">{h.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Valori */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">I nostri valori</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                  <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-bloods-800 to-bloods-950 p-3 text-white shadow-lg">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-bold text-white">{v.title}</h3>
                  <p className="mt-2 text-sm text-dark-300 leading-relaxed">{v.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Strumenti */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">I nostri strumenti</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex gap-4 rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
                  <div className="shrink-0 inline-flex rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-700/10 p-3 text-gold-400 border border-gold-500/30">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{f.title}</h3>
                    <p className="mt-1 text-sm text-dark-300 leading-relaxed">{f.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-bloods-900 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-bloods-950 via-dark-900 to-bloods-950" />
          <div className="relative px-6 py-14">
            <Sparkles className="mx-auto mb-4 text-gold-400" size={30} />
            <h2 className="text-3xl font-extrabold text-white">Vuoi far parte della storia?</h2>
            <p className="mt-3 text-dark-300 max-w-lg mx-auto">
              Cerchiamo giocatori motivati. Entra nel Discord e presentati.
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
