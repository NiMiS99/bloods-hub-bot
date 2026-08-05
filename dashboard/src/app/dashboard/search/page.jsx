'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Search, Users, MessageSquare, Bell, Cake, Tag, Star, Gift } from 'lucide-react';

export default function SearchPage() {
  const { guild } = useGuild();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (guild && query.length >= 2) search(); }, [guild, query]);

  async function search() {
    setLoading(true);
    // Search across multiple endpoints
    const [members, suggestions, reminders, birthdays, tags, starboard, giveaways] = await Promise.all([
      api.getMembers(guild.id, 1, 50).catch(() => ({ members: [] })),
      api.getSuggestions(guild.id, 'all').catch(() => ({ suggestions: [] })),
      api.getReminders(guild.id).catch(() => ({ reminders: [] })),
      api.getBirthdays(guild.id).catch(() => ({ birthdays: [] })),
      api.getTags(guild.id).catch(() => ({ tags: [] })),
      api.getStarboard(guild.id).catch(() => ({ starboard: [] })),
      api.getGiveaways(guild.id).catch(() => ({ giveaways: [] })),
    ]);
    const q = query.toLowerCase();
    const r = [];
    (members.members || []).forEach(m => { if (m.username?.toLowerCase().includes(q)) r.push({ type: 'member', icon: Users, title: m.username, sub: `Livello ${m.level}` }); });
    (suggestions.suggestions || []).forEach(s => { if (s.title?.toLowerCase().includes(q) || s.content?.toLowerCase().includes(q)) r.push({ type: 'suggestion', icon: MessageSquare, title: s.title, sub: s.status }); });
    (reminders.reminders || []).forEach(rm => { if (rm.content?.toLowerCase().includes(q)) r.push({ type: 'reminder', icon: Bell, title: rm.content, sub: new Date(rm.remind_at).toLocaleDateString('it-IT') }); });
    (birthdays.birthdays || []).forEach(b => { if (b.user_id?.includes(q)) r.push({ type: 'birthday', icon: Cake, title: `User ${b.user_id}`, sub: `${b.day}/${b.month}` }); });
    (tags.tags || []).forEach(t => { if (t.name?.toLowerCase().includes(q)) r.push({ type: 'tag', icon: Tag, title: `/${t.name}`, sub: t.content?.substring(0, 50) }); });
    (starboard.starboard || []).forEach(s => { if (s.content?.toLowerCase().includes(q)) r.push({ type: 'starboard', icon: Star, title: s.content?.substring(0, 60), sub: `${s.star_count} stelle` }); });
    (giveaways.giveaways || []).forEach(g => { if (g.prize?.toLowerCase().includes(q)) r.push({ type: 'giveaway', icon: Gift, title: g.prize, sub: g.status }); });
    setResults(r);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Search className="w-6 h-6" /> Ricerca Globale
      </h1>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca membri, suggerimenti, tag, promemoria..."
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none mb-6"
      />
      {loading && <div className="text-zinc-400">Ricerca in corso...</div>}
      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="text-zinc-500 text-center py-8">Nessun risultato per "{query}"</div>
      )}
      <div className="grid gap-2">
        {results.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 flex items-center gap-3">
              <Icon className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white text-sm">{r.title}</p>
                <p className="text-zinc-500 text-xs">{r.sub} · {r.type}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
