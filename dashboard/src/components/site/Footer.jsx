import Link from 'next/link';
import { MessageCircle, Trophy, Calendar, UserPlus, Swords, Info, Users, Mail, ExternalLink } from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

export default function Footer() {
  return (
    <footer className="border-t border-dark-800 bg-dark-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Bloods" className="h-12 w-12" />
              <div className="leading-tight">
                <span className="block font-extrabold tracking-wide text-white text-lg">BLOODS</span>
                <span className="block text-[10px] uppercase tracking-[0.25em] text-gold-400">WoW Guild</span>
              </div>
            </div>
            <p className="text-sm text-dark-400 max-w-xs">{siteConfig.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-400 mb-4">Navigazione</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/raid" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><Swords size={14} /> Raid & Progress</Link></li>
              <li><Link href="/classifiche" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><Trophy size={14} /> Classifiche</Link></li>
              <li><Link href="/hall-of-fame" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><Trophy size={14} /> Hall of Fame</Link></li>
              <li><Link href="/eventi" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><Calendar size={14} /> Eventi</Link></li>
              <li><Link href="/chi-siamo" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><Info size={14} /> Chi siamo</Link></li>
              <li><Link href="/unisciti" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><UserPlus size={14} /> Unisciti a noi</Link></li>
              <li><Link href="/dashboard" className="text-dark-300 hover:text-white transition-colors inline-flex items-center gap-2"><MessageCircle size={14} /> Dashboard membri</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold-400 mb-4">Contatti</h3>
            <ul className="space-y-3 text-sm text-dark-300">
              <li>
                <a href={`mailto:${siteConfig.email}`} className="inline-flex items-center gap-2 text-dark-300 hover:text-white transition-colors">
                  <Mail size={14} className="text-gold-400" /> {siteConfig.email}
                </a>
              </li>
              <li>
                <a href={siteConfig.discordInvite} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-dark-300 hover:text-white transition-colors">
                  <ExternalLink size={14} className="text-gold-400" /> Discord
                </a>
              </li>
              <li className="pt-2 border-t border-dark-800/50 text-xs text-dark-500">
                Realm: <span className="text-dark-300">{siteConfig.realm}</span> · Regione: <span className="text-dark-300">{siteConfig.region}</span> · Fazione: <span className="text-dark-300">{siteConfig.faction}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-dark-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-dark-500">© {new Date().getFullYear()} Bloods Guild — {siteConfig.domain}. Tutti i diritti riservati.</p>
          <p className="text-xs text-dark-500">World of Warcraft e Blizzard Entertainment sono marchi registrati di Blizzard Entertainment, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
