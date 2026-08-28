'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, LogIn, LogOut, UserCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/raid', label: 'Raid' },
  { href: '/classifiche', label: 'Classifiche' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/eventi', label: 'Eventi' },
  { href: '/chi-siamo', label: 'Chi siamo' },
  { href: '/unisciti', label: 'Unisciti' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    window.location.href = '/';
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'bg-dark-950/90 backdrop-blur-md border-dark-800 shadow-lg shadow-black/30'
          : 'bg-transparent border-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Bloods"
              className="h-10 w-10 transition-transform group-hover:scale-105"
            />
            <div className="leading-tight">
              <span className="block font-extrabold tracking-wide text-white text-lg">BLOODS</span>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-gold-400">WoW Guild</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    active ? 'text-gold-300 bg-white/5' : 'text-dark-200 hover:text-white hover:bg-white/5'
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
            {user ? (
              <div className="relative ml-3" ref={menuRef}>
                <button
                  onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-900/80 px-3 py-1.5 hover:border-dark-600 transition-colors"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-7 w-7 rounded-full" />
                  ) : (
                    <UserCircle size={22} className="text-dark-300" />
                  )}
                  <span className="text-sm font-medium text-white max-w-[8rem] truncate">
                    {user.global_name || user.username}
                  </span>
                  <ChevronDown size={14} className={cn('text-dark-400 transition-transform', userMenu && 'rotate-180')} />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-dark-700 bg-dark-900 shadow-xl py-1.5 z-50">
                    <Link href="/area" className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-200 hover:text-white hover:bg-dark-800">
                      <UserCircle size={16} /> Area personale
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-200 hover:text-white hover:bg-dark-800">
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-bloods-400 hover:text-bloods-300 hover:bg-dark-800"
                    >
                      <LogOut size={16} /> Esci
                    </button>
                  </div>
                )}
              </div>
            ) : user === null ? (
              <a
                href="/api/auth/discord?next=/area"
                className="ml-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-bloods-800 to-bloods-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-bloods-900/40 transition-transform hover:-translate-y-0.5"
              >
                <LogIn size={16} />
                Accedi
              </a>
            ) : null}
          </nav>

          <button
            className="md:hidden text-dark-200 hover:text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-dark-800 bg-dark-950/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-dark-200 hover:text-white hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/area" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-bloods-800">
                  <UserCircle size={16} /> Area personale
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-dark-200 hover:text-white hover:bg-white/5">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-bloods-400 hover:bg-white/5">
                  <LogOut size={16} /> Esci
                </button>
              </>
            ) : user === null ? (
              <a
                href="/api/auth/discord?next=/area"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-bloods-800"
              >
                <LogIn size={16} /> Accedi con Discord
              </a>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
