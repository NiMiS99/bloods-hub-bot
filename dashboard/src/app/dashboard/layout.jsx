'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { GuildContext } from '@/lib/guildContext';
import { SearchBar } from './SearchBar';
import {
  LayoutDashboard, Gamepad2, Users, Shield, Calendar, Trophy,
  BarChart3, Award, ScrollText, Settings, LogOut, Menu, X,
  ChevronDown, Bell, Search, Gift, Bot, FileText, Swords,
  PartyPopper, Clock, TerminalSquare, Lightbulb, Zap, Tag,
  Sun, Moon, Activity
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Panoramica', icon: LayoutDashboard },
  { href: '/dashboard/games', label: 'Giochi', icon: Gamepad2 },
  { href: '/dashboard/members', label: 'Membri', icon: Users },
  { href: '/dashboard/moderation', label: 'Moderazione', icon: Shield },
  { href: '/dashboard/events', label: 'Eventi', icon: Calendar },
  { href: '/dashboard/leaderboard', label: 'Classifiche', icon: Trophy },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/badges', label: 'Badge', icon: Award },
  { href: '/dashboard/level-rewards', label: 'Ricompense Livelli', icon: Gift },
  { href: '/dashboard/raid', label: 'Raid & Progress', icon: Swords },
  { href: '/dashboard/giveaways', label: 'Giveaway', icon: PartyPopper },
  { href: '/dashboard/suggestions', label: 'Suggerimenti', icon: Lightbulb },
  { href: '/dashboard/polls', label: 'Sondaggi', icon: BarChart3 },
  { href: '/dashboard/lfg', label: 'Sessioni LFG', icon: Gamepad2 },
  { href: '/dashboard/xp-events', label: 'Eventi XP', icon: Zap },
  { href: '/dashboard/scheduled-messages', label: 'Messaggi Programmati', icon: Clock },
  { href: '/dashboard/custom-commands', label: 'Comandi Custom', icon: TerminalSquare },
  { href: '/dashboard/automod', label: 'Auto-Mod', icon: Bot },
  { href: '/dashboard/discord-logs', label: 'Log Discord', icon: FileText },
  { href: '/dashboard/audit-log', label: 'Registro Attività', icon: ScrollText },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings },
  { href: '/dashboard/health', label: 'Health Check', icon: Activity },
];

export default function DashboardLayout({ children, params }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [guildMenuOpen, setGuildMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  useEffect(() => {
    async function init() {
      try {
        const me = await api.getMe();
        setUser(me);
        const { guilds } = await api.getGuilds();
        setGuilds(guilds);
        const adminGuilds = guilds.filter((g) => g.isAdmin || g.isMod);
        if (adminGuilds.length > 0) {
          const stored = localStorage.getItem('selectedGuild');
          const g = stored ? adminGuilds.find((g) => g.id === stored) : null;
          setSelectedGuild(g || adminGuilds[0]);
          localStorage.setItem('selectedGuild', (g || adminGuilds[0]).id);
        }
      } catch {
        // Don't use router.push (causes re-render loop). Use hard redirect.
        window.location.href = '/login';
        return;
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function selectGuild(g) {
    setSelectedGuild(g);
    localStorage.setItem('selectedGuild', g.id);
    setGuildMenuOpen(false);
  }

  async function handleLogout() {
    await api.logout();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (guilds.filter((g) => g.isAdmin || g.isMod).length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Nessun server gestito</h1>
          <p className="text-dark-300">Non hai permessi admin/mod in nessun server dove il bot è presente.</p>
        </div>
      </div>
    );
  }

  const adminGuilds = guilds.filter((g) => g.isAdmin || g.isMod);

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative z-50 w-64 h-full bg-dark-900 border-r border-dark-800 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bloods-700 to-bloods-900 flex items-center justify-center text-white font-bold text-lg">
            B
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Bloods Hub</h1>
            <p className="text-xs text-dark-400">Dashboard Admin</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Guild selector */}
        <div className="px-4 py-3 border-b border-dark-800 relative">
          <button
            onClick={() => setGuildMenuOpen(!guildMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800 transition-colors"
          >
            {selectedGuild?.icon ? (
              <img src={selectedGuild.icon} alt="" className="w-8 h-8 rounded-lg" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-xs font-bold">
                {selectedGuild?.name?.[0] || '?'}
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedGuild?.name}</p>
              <p className="text-xs text-dark-400">{selectedGuild?.memberCount} membri</p>
            </div>
            <ChevronDown size={16} className={cn('text-dark-400 transition-transform', guildMenuOpen && 'rotate-180')} />
          </button>

          {guildMenuOpen && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-dark-850 border border-dark-700 rounded-lg shadow-xl py-1 max-h-64 overflow-y-auto z-50">
              {adminGuilds.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectGuild(g)}
                  className={cn(
                    'w-full flex items-center gap-3 p-2 hover:bg-dark-800 transition-colors text-left',
                    selectedGuild?.id === g.id && 'bg-dark-800'
                  )}
                >
                  {g.icon ? (
                    <img src={g.icon} alt="" className="w-7 h-7 rounded-md" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-dark-700 flex items-center justify-center text-xs font-bold">
                      {g.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{g.name}</p>
                    <p className="text-xs text-dark-400">{g.isAdmin ? 'Admin' : 'Moderatore'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-gradient-to-r from-bloods-800 to-bloods-900 text-white shadow-lg shadow-bloods-900/20'
                    : 'text-dark-300 hover:text-white hover:bg-dark-800'
                )}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-dark-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-dark-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold">
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.global_name || user.username}</p>
              <p className="text-xs text-dark-400">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-dark-800 transition-colors"
          >
            <LogOut size={16} />
            Disconnetti
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 bg-dark-900 border-b border-dark-800">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-dark-300 hover:text-white">
            <Menu size={22} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {NAV_ITEMS.find((i) => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
              title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            >
              {theme === 'dark' ? <Sun size={18} className="text-dark-300" /> : <Moon size={18} className="text-dark-300" />}
            </button>
            <button className="relative p-2 rounded-lg hover:bg-dark-800 transition-colors">
              <Bell size={18} className="text-dark-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-bloods-600 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <GuildContext.Provider value={{ guild: selectedGuild, user }}>
            {children}
          </GuildContext.Provider>
        </main>
      </div>
    </div>
  );
}
