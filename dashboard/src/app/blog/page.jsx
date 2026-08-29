'use client';

import { useState } from 'react';
import { Newspaper, Search, Calendar, ArrowRight, Tag } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import Reveal from '@/components/site/Reveal';
import { siteConfig } from '@/lib/siteConfig';

const ARTICLES = [
  {
    slug: 'midnight-season-2-guida',
    title: 'Midnight Season 2: guida completa per la gilda Bloods',
    excerpt: 'Tutto quello che devi sapere sulla nuova stagione di WoW: Ulatek, nuovo raid, M+, gear reset e come prepararsi con i Bloods.',
    date: '2026-08-29',
    category: 'WoW',
    readTime: '5 min',
    tags: ['Midnight', 'Season 2', 'Ulatek', 'Raid', 'M+'],
  },
  {
    slug: 'raid-mercoledi-giovedi-orari',
    title: 'Raid Mercoledi e Giovedi: perche questi giorni sono sacri per i Bloods',
    excerpt: 'La storia dietro la scelta dei giorni di raid, come si organizza il roster mitico e cosa aspettarsi dalle serate progress.',
    date: '2026-08-28',
    category: 'Community',
    readTime: '3 min',
    tags: ['Raid', 'Schedule', 'Progress', 'Mythic'],
  },
  {
    slug: 'bloods-points-sistema-loot',
    title: 'Bloods Points: come funziona il nostro sistema loot DKP',
    excerpt: 'Guida completa al sistema Bloods Points: roll, bid, punteggi, eligibilita e strategie per massimizzare il tuo loot.',
    date: '2026-08-27',
    category: 'Guide',
    readTime: '7 min',
    tags: ['Bloods Points', 'DKP', 'Loot', 'Sistema'],
  },
  {
    slug: 'multigioco-dayz-metin2-lol',
    title: 'Bloods non e solo WoW: DayZ, Metin2 e LoL nella nostra community',
    excerpt: 'Scopri il brand Bloods oltre WoW: server privato DayZ, gilda affiliata Metin2, e LoL con il capogilda in prima linea.',
    date: '2026-08-26',
    category: 'Community',
    readTime: '4 min',
    tags: ['DayZ', 'Metin2', 'LoL', 'Multigioco', 'Brand'],
  },
  {
    slug: 'come-unirsi-bloods-tutorial',
    title: 'Come unirsi ai Bloods: tutorial completo di onboarding',
    excerpt: 'Dal ticket Discord al colloquio, dall\'assegnazione tag al mentor 1-to-1: tutto il percorso per entrare nella famiglia Bloods.',
    date: '2026-08-25',
    category: 'Guide',
    readTime: '5 min',
    tags: ['Reclutamento', 'Onboarding', 'Discord', 'Ticket'],
  },
  {
    slug: 'wow-midnight-raid-preparation',
    title: 'Preparazione raid Midnight: addon, consumabili e requisiti',
    excerpt: 'DBM, WeakAuras, Details, consumabili, 75% presenza, M+ settimanale: tutto quello che serve per essere Raider Mitico.',
    date: '2026-08-24',
    category: 'WoW',
    readTime: '6 min',
    tags: ['Raid', 'Addon', 'DBM', 'WeakAuras', 'Raider Mitico'],
  },
];

const CATEGORIES = ['Tutti', 'WoW', 'Community', 'Guide'];

export default function BlogPage() {
  const [filter, setFilter] = useState('Tutti');
  const [search, setSearch] = useState('');

  const filtered = ARTICLES.filter((a) => {
    if (filter !== 'Tutti' && a.category !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.excerpt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <SiteShell>
      <PageHeader
        title="Blog & News"
        subtitle="Guide WoW, aggiornamenti community e contenuti Bloods"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-24 space-y-10">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === cat
                    ? 'bg-bloods-800 text-white'
                    : 'bg-dark-900 text-dark-300 hover:text-white hover:bg-dark-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              placeholder="Cerca articolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-dark-900 border border-dark-800 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-bloods-700 w-full sm:w-64"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((article, i) => (
              <Reveal key={article.slug} delay={i * 75}>
                <article className="group rounded-2xl border border-dark-800 bg-dark-900/60 p-6 hover:border-bloods-700/50 transition-all hover:-translate-y-1 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <span className="rounded-md bg-bloods-900/40 px-2 py-1 text-bloods-300 font-medium">
                      {article.category}
                    </span>
                    <span className="text-dark-500 inline-flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(article.date).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    <span className="text-dark-500">{article.readTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2 group-hover:text-bloods-300 transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-dark-300 mb-4 flex-1">{article.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 text-[10px] text-dark-400">
                          <Tag size={10} /> {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-bloods-400 group-hover:text-bloods-300 text-sm font-medium inline-flex items-center gap-1">
                      Leggi <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Newspaper size={48} className="mx-auto mb-4 text-dark-600" />
            <p className="text-dark-400">Nessun articolo trovato.</p>
          </div>
        )}

        <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Vuoi scrivere per il blog?</h3>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            Sei un membro Bloods con voglia di condividere guide e contenuti? Entra su Discord e proponi il tuo articolo.
          </p>
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
          >
            Entra su Discord <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
