'use client';

import { Swords, Heart, Users, Shield, Zap, Trophy, Bot, Gamepad2, Sparkles, ArrowRight } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig } from '@/lib/siteConfig';

const HISTORY = [
  { year: '20/09/2025', text: 'Bloods nasce su Pozzo dell\'Eternità (Orda) come gilda italiana soft-progress, con l\'obiettivo di unire progress raid e amicizia, senza i limiti delle gilde hardcore.' },
  { year: 'Crescita', text: 'La community si espande: bot Bloods Points per il loot, sistema XP, dashboard web, tracciamento presenze raid e integrazione Warcraft Logs.' },
  { year: 'Rilancio Midnight', text: 'Con l\'arrivo di Midnight, la gilda si rilancia con regolamento v3.0, roster mitico a 20, braccio PvP strutturato (RBG + arena) e programma mentorship per Social.' },
];

const VALUES = [
  { icon: Heart, title: 'Rispetto', text: 'Zero tossicità, zero flame sui wipe. Il rispetto reciproco è SEMPRE obbligatorio (regolamento c1-c6).' },
  { icon: Swords, title: 'Soft-Progress', text: 'Mentalità rivolta al progress, ma con approccio tollerante. La chiusura del raid non è obiettivo principale, ma auspicabile.' },
  { icon: Users, title: 'Community 360°', text: 'Accogliamo social, returning e casual con tag @Social. Mentorship 1-to-1 per chi vuole salire al roster raid.' },
  { icon: Shield, title: 'Organizzazione', text: 'Discord strutturato, bot Bloods Points, presenze tracciate, Warcraft Logs, regolamento v3.0. Tutto trasparente.' },
];

const FEATURES = [
  { icon: Bot, title: 'Bloods Hub Bot', text: '71 comandi slash: XP, BP/DKP, raid management, loot roll, moderazione, giveaway, music e altro.' },
  { icon: Swords, title: 'Raid & BP System', text: 'Eligibilità automatica, tracking presenze, loot con Bloods Points (roll + bid DKP), integrazione Warcraft Logs.' },
  { icon: Trophy, title: 'Classifiche', text: 'XP, messaggi, ore vocali e BP: tutto tracciato e visibile sul sito web.' },
  { icon: Gamepad2, title: 'Multi-gioco 360°', text: 'Raid mitico, M+, PvP (RBG/arena), social, alt, eventi cross-game. C\'è posto per tutti.' },
];

export default function ChiSiamoPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Chi siamo"
        subtitle={`Gilda IT soft-progress · Fondata il ${siteConfig.founded} — ${siteConfig.realm} (${siteConfig.region}) · ${siteConfig.faction}`}
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

        {/* Gradi gilda */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Gradi della gilda</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { grade: 'Owner', desc: 'Decisioni finali, espulsioni' },
              { grade: 'Founder', desc: 'Co-fondatori, proposte modifiche' },
              { grade: 'Consigliere', desc: 'Coordina Officer, espulsioni' },
              { grade: 'Officer', desc: 'Convivenza, segnala problemi' },
              { grade: 'Officer Reclutamento', desc: 'Reclutamento dedicato' },
              { grade: 'Raid Leader', desc: 'Gestisce raid e tattiche' },
              { grade: 'Raider', desc: 'Partecipa ai raid settimanali' },
              { grade: 'Membro', desc: 'Grado di partenza' },
            ].map((g) => (
              <div key={g.grade} className="rounded-xl border border-dark-800 bg-dark-900/60 p-4">
                <p className="font-bold text-gold-300 text-sm">{g.grade}</p>
                <p className="mt-1 text-xs text-dark-400">{g.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-dark-500">
            Tag trasversali: @Tank / @Healer / @DPS · @Raider Mitico · @PvP · @Social · @Mentor
          </p>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-bloods-900 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-bloods-950 via-dark-900 to-bloods-950" />
          <div className="relative px-6 py-14">
            <Sparkles className="mx-auto mb-4 text-gold-400" size={30} />
            <h2 className="text-3xl font-extrabold text-white">Vuoi far parte della storia?</h2>
            <p className="mt-3 text-dark-300 max-w-lg mx-auto">
              Cerchiamo player per roster mitico, M+, PvP e social. Entra nel Discord e apri un ticket reclutamento.
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
