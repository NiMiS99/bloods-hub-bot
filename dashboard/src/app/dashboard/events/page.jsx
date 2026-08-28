'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { Calendar, Plus, Trash2, Users, X } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function EventsPage() {
  const { guild } = useGuild();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', scheduledAt: '', durationMinutes: 60, gameCode: '' });

  useEffect(() => { if (guild) loadEvents(); }, [guild]);

  async function loadEvents() {
    const { events } = await api.getEvents(guild.id);
    setEvents(events);
    setLoading(false);
  }

  async function createEvent() {
    if (!form.name || !form.scheduledAt) return;
    await api.createEvent(guild.id, form);
    setForm({ name: '', description: '', scheduledAt: '', durationMinutes: 60, gameCode: '' });
    setShowAdd(false);
    loadEvents();
  }

  async function deleteEvent(id) {
    if (!confirm('Eliminare questo evento?')) return;
    await api.deleteEvent(guild.id, id);
    loadEvents();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{events.length} eventi</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Crea evento</button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo evento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm text-dark-300 mb-1 block">Nome</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Torneo Valorant" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Data e ora</label><input type="datetime-local" className="input" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Durata (minuti)</label><input type="number" className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) })} /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Gioco (opzionale)</label><input className="input" value={form.gameCode} onChange={(e) => setForm({ ...form, gameCode: e.target.value })} placeholder="valorant" /></div>
          </div>
          <div><label className="text-sm text-dark-300 mb-1 block">Descrizione</label><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-2"><button onClick={createEvent} className="btn-primary">Crea</button><button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-dark-400">
            <Calendar size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nessun evento. Creane uno!</p>
          </div>
        ) : events.map((e) => (
          <div key={e.id} className={`card p-5 ${!e.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-bloods-500" />
                <h3 className="font-semibold text-white">{e.name}</h3>
              </div>
              <button onClick={() => deleteEvent(e.id)} className="p-1.5 hover:bg-dark-800 rounded-lg"><Trash2 size={16} className="text-dark-400 hover:text-red-400" /></button>
            </div>
            {e.description && <p className="text-sm text-dark-300 mb-3">{e.description}</p>}
            <div className="space-y-1.5 text-sm">
              <p className="text-dark-300">📅 {formatDateTime(e.scheduledAt)}</p>
              <p className="text-dark-300">⏱️ {e.durationMinutes} min</p>
              {e.game && <p className="text-dark-300">🎮 {e.game.name}</p>}
              <p className="text-dark-300 flex items-center gap-1"><Users size={14} /> {e.participantCount} partecipanti</p>
            </div>
            <div className="mt-3 pt-3 border-t border-dark-800">
              <span className={`badge ${e.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>{e.isActive ? 'Attivo' : 'Eliminato'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
