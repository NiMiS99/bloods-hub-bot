'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { TerminalSquare, Search } from 'lucide-react';

export default function CommandsPage() {
  const { guild } = useGuild();
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { commands } = await api.getCommands(guild.id);
    setCommands(commands);
    setLoading(false);
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  const categories = ['all', ...new Set(commands.map(c => c.category))];
  const filtered = commands.filter(c => {
    const matchCat = category === 'all' || c.category === category;
    const matchFilter = !filter ||
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.description?.toLowerCase().includes(filter.toLowerCase());
    return matchCat && matchFilter;
  });

  const catColors = {
    user: 'bg-blue-500/20 text-blue-400',
    mod: 'bg-orange-500/20 text-orange-400',
    admin: 'bg-red-500/20 text-red-400',
    raid: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TerminalSquare className="w-6 h-6" /> Comandi ({commands.length})
      </h1>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cerca comando..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'all' ? 'Tutte le categorie' : c}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        {filtered.map((cmd) => (
          <div key={cmd.name} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <code className="text-purple-400 font-mono">/{cmd.name}</code>
              <span className="text-zinc-400 text-sm">{cmd.description}</span>
            </div>
            <div className="flex items-center gap-2">
              {cmd.options && cmd.options.length > 0 && (
                <span className="text-zinc-600 text-xs">{cmd.options.length} opzioni</span>
              )}
              <span className={`text-xs px-2 py-1 rounded ${catColors[cmd.category] || 'bg-zinc-700 text-zinc-300'}`}>
                {cmd.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-zinc-500 text-center py-8">
          <TerminalSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun comando trovato per "{filter}"</p>
        </div>
      )}
    </div>
  );
}
