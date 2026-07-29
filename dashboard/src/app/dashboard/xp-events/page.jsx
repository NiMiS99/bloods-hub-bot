'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime } from '@/lib/utils';
import { Zap, Play, Square, Plus } from 'lucide-react';
import { UserMention } from '@/lib/useUsers';

export default function XpEventsPage() {
  const { guild } = useGuild();
  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ multiplier: 2, durationHours: 24 });

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { events, active } = await api.getXpEvents(guild.id);
    setEvents(events || []);
    setActiveEvent(active);
    setLoading(false);
  }

  async function startEvent() {
    await api.startXpEvent(guild.id, form);
    setShowAdd(false);
    load();
  }

  async function stopEvent() {
    if (!confirm("Fermare l'evento XP attivo?")) return;
    await api.stopXpEvent(guild.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap /> Eventi XP</h1>
        {!activeEvent && <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Nuovo evento</button>}
      </div>

      {activeEvent && (
        <div className="card p-6 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-400">🎉 Evento Attivo: x{activeEvent.multiplier}</h3>
              <p className="text-dark-300 mt-1">Scade: {formatDateTime(activeEvent.endsAt)}</p>
              <p className="text-dark-400 text-sm">Avviato da <UserMention userId={activeEvent.startedBy} guildId={guild.id} /></p>
            </div>
            <button onClick={stopEvent} className="btn-danger flex items-center gap-2"><Square size={16} /> Ferma</button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo Evento XP</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Moltiplicatore</label>
              <input type="number" className="input" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: parseInt(e.target.value) })} min="2" max="10" />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Durata (ore)</label>
              <input type="number" className="input" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: parseInt(e.target.value) })} min="1" max="168" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={startEvent} className="btn-primary flex items-center gap-2"><Play size={16} /> Avvia</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      )}

      <p className="text-dark-400">{events.length} eventi storici</p>

      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="card p-3 flex items-center justify-between">
              <div>
                <span className="text-white font-medium">x{e.multiplier}</span>
                <span className="text-dark-400 text-sm ml-3">{formatDateTime(e.startedAt)} → {formatDateTime(e.endsAt)}</span>
              </div>
              <span className="text-dark-400 text-sm">da <UserMention userId={e.startedBy} guildId={guild.id} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
