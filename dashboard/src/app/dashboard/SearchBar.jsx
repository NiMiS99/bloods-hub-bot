'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

// All searchable pages — must match NAV_ITEMS in layout
const PAGES = [
  { href: '/dashboard', label: 'Dashboard', keywords: 'home overview panoramica' },
  { href: '/dashboard/members', label: 'Membri', keywords: 'utenti users giocatori' },
  { href: '/dashboard/games', label: 'Giochi', keywords: 'games videogiochi catalogo' },
  { href: '/dashboard/leaderboard', label: 'Classifica', keywords: 'leaderboard ranking top livelli xp' },
  { href: '/dashboard/warnings', label: 'Warning', keywords: 'warnings ammonizioni moderazione' },
  { href: '/dashboard/audit-log', label: 'Audit Log', keywords: 'audit log azioni admin dashboard' },
  { href: '/dashboard/automod', label: 'Auto Mod', keywords: 'automod auto mod filtri regole' },
  { href: '/dashboard/badges', label: 'Badge', keywords: 'badges medaglie achievement' },
  { href: '/dashboard/level-rewards', label: 'Premi Livello', keywords: 'level rewards ruoli auto' },
  { href: '/dashboard/events', label: 'Eventi', keywords: 'events community eventi community' },
  { href: '/dashboard/raid', label: 'Raid', keywords: 'raid dkp progress loot spedizione' },
  { href: '/dashboard/suggestions', label: 'Suggerimenti', keywords: 'suggestions suggerimenti idee' },
  { href: '/dashboard/polls', label: 'Sondaggi', keywords: 'polls sondaggi votazioni' },
  { href: '/dashboard/lfg', label: 'LFG', keywords: 'lfg sessioni gruppo' },
  { href: '/dashboard/xp-events', label: 'XP Eventi', keywords: 'xp events boost moltiplicatore' },
  { href: '/dashboard/game-nights', label: 'Game Night', keywords: 'game night serata' },
  { href: '/dashboard/tags', label: 'Tag', keywords: 'tags etichette snippet' },
  { href: '/dashboard/giveaways', label: 'Giveaway', keywords: 'giveaway regali sorteggio' },
  { href: '/dashboard/reminders', label: 'Promemoria', keywords: 'reminders promemoria' },
  { href: '/dashboard/scheduled-messages', label: 'Msg Programmati', keywords: 'scheduled messages programmati cron' },
  { href: '/dashboard/settings', label: 'Impostazioni', keywords: 'settings impostazioni config' },
  { href: '/dashboard/health', label: 'Health Check', keywords: 'health check status monitor' },
];

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return PAGES.slice(0, 6);
    const q = query.toLowerCase();
    return PAGES.filter((p) =>
      p.label.toLowerCase().includes(q) || p.keywords.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  // Navigate
  function navigateTo(href) {
    router.push(href);
    setOpen(false);
  }

  // Keyboard navigation
  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) navigateTo(results[activeIndex].href);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-dark-800 rounded-lg text-sm text-dark-400 hover:bg-dark-700 transition-colors"
      >
        <Search size={16} />
        <span>Cerca...</span>
        <kbd className="text-xs text-dark-500 ml-2 px-1 py-0.5 bg-dark-900 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={() => setOpen(false)}
      />
      {/* Search modal */}
      <div
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50"
      >
        <div className="card p-0 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-800">
            <Search size={20} className="text-dark-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Cerca pagine..."
              className="flex-1 bg-transparent text-white outline-none placeholder-dark-500"
            />
            <button onClick={() => setOpen(false)} className="text-dark-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-dark-400 text-sm">
                Nessun risultato per "{query}"
              </div>
            ) : (
              results.map((page, idx) => (
                <button
                  key={page.href}
                  onClick={() => navigateTo(page.href)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    idx === activeIndex ? 'bg-dark-800' : 'hover:bg-dark-850'
                  }`}
                >
                  <Search size={16} className="text-dark-500" />
                  <span className="text-white text-sm font-medium">{page.label}</span>
                  <span className="text-dark-500 text-xs ml-auto">{page.href}</span>
                </button>
              ))
            )}
          </div>
          {/* Footer */}
          <div className="px-4 py-2 border-t border-dark-800 flex items-center justify-between text-xs text-dark-500">
            <span>↑↓ naviga • ↵ apri • esc chiudi</span>
            <span>{results.length} risultati</span>
          </div>
        </div>
      </div>
    </>
  );
}
