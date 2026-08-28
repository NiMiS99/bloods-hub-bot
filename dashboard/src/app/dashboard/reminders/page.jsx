'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Bell, Trash2 } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function RemindersPage() {
  const { guild } = useGuild();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { reminders } = await api.getReminders(guild.id);
    setReminders(reminders);
    setLoading(false);
  }

  async function del(id) {
    if (!confirm('Eliminare questo promemoria?')) return;
    await api.deleteReminder(guild.id, id);
    load();
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6" /> Promemoria
      </h1>
      {reminders.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun promemoria attivo. Usa <code className="text-zinc-400">/remind</code> su Discord.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reminders.map((r) => (
            <div key={r.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-white">{r.content || r.message}</p>
                <p className="text-zinc-500 text-sm mt-1">
                  {new Date(r.remind_at).toLocaleString('it-IT')}
                </p>
              </div>
              <button onClick={() => del(r.id)} className="text-red-400 hover:text-red-300 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
