'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Star } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function StarboardPage() {
  const { guild } = useGuild();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { starboard } = await api.getStarboard(guild.id);
    setEntries(starboard);
    setLoading(false);
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Star className="w-6 h-6" /> Starboard
      </h1>
      {entries.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun messaggio in starboard. I messaggi con enough reazioni ⭐ appariranno qui.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((e) => (
            <div key={e.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">{e.star_count}</span>
                <span className="text-zinc-600 text-sm">stelle</span>
              </div>
              <p className="text-zinc-300 text-sm">{e.content?.substring(0, 200)}</p>
              <p className="text-zinc-600 text-xs mt-2">
                Canale: <code>{e.channel_id}</code> · Messaggio: <code>{e.message_id}</code>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
