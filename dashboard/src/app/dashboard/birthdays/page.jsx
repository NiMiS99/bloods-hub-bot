'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Cake } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export default function BirthdaysPage() {
  const { guild } = useGuild();
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { birthdays } = await api.getBirthdays(guild.id);
    setBirthdays(birthdays);
    setLoading(false);
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Cake className="w-6 h-6" /> Compleanni
      </h1>
      {birthdays.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">
          <Cake className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun compleanno registrato. Usa <code className="text-zinc-400">/birthday set</code> su Discord.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {birthdays.map((b) => (
            <div key={b.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center gap-4">
              <div className="bg-purple-500/20 text-purple-400 rounded-lg w-12 h-12 flex items-center justify-center font-bold">
                {b.day}
              </div>
              <div>
                <p className="text-white font-semibold">{MONTHS[b.month - 1]}</p>
                <p className="text-zinc-500 text-sm">User ID: {b.user_id}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
