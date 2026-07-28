'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { PartyPopper, Plus, Trophy, X, Users, Clock } from 'lucide-react';

export default function GiveawaysPage() {
  const { guild } = useGuild();
  const [giveaways, setGiveaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ channelId: '', prize: '', title: '', description: '', durationMinutes: 60, winnerCount: 1, requiredRoleId: '' });

  useEffect(() => { if (guild) loadGiveaways(); }, [guild]);

  async function loadGiveaways() {
    const { giveaways } = await api.getGiveaways(guild.id);
    setGiveaways(giveaways);
    setLoading(false);
  }

  async function createGiveaway() {
    if (!form.channelId || !form.prize || !form.durationMinutes) return;
    await api.createGiveaway(guild.id, form);
    setForm({ channelId: '', prize: '', title: '', description: '', durationMinutes: 60, winnerCount: 1, requiredRoleId: '' });
    setShowAdd(false);
    loadGiveaways();
  }

  async function endGiveaway(id) {
    if (!confirm('Terminare questo giveaway ora? I vincitori verranno estratti.')) return;
    await api.endGiveaway(guild.id, id);
    loadGiveaways();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{giveaways.length} giveaway</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Crea giveaway</button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo giveaway</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm text-dark-300 mb-1 block">ID Canale Discord</label><input className="input" value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} placeholder="123456789012345678" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Premio</label><input className="input" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} placeholder="100€ PayPal" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Titolo (opzionale)</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Giveaway Estivo" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Durata (minuti)</label><input type="number" className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) })} /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Numero vincitori</label><input type="number" className="input" value={form.winnerCount} onChange={(e) => setForm({ ...form, winnerCount: parseInt(e.target.value) })} min="1" max="20" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Ruolo richiesto (opzionale)</label><input className="input" value={form.requiredRoleId} onChange={(e) => setForm({ ...form, requiredRoleId: e.target.value })} placeholder="ID ruolo" /></div>
          </div>
          <div><label className="text-sm text-dark-300 mb-1 block">Descrizione (opzionale)</label><textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-2"><button onClick={createGiveaway} className="btn-primary">Crea</button><button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {giveaways.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-dark-400">
            <PartyPopper size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nessun giveaway. Creane uno!</p>
          </div>
        ) : giveaways.map((g) => (
          <div key={g.id} className={`card p-5 ${g.is_ended ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <PartyPopper size={18} className="text-bloods-500" />
                <h3 className="font-semibold text-white">{g.title || g.prize}</h3>
              </div>
            </div>
            {g.description && <p className="text-sm text-dark-300 mb-3">{g.description}</p>}
            <div className="space-y-1.5 text-sm">
              <p className="text-dark-300">🎁 <span className="text-white">{g.prize}</span></p>
              <p className="text-dark-300 flex items-center gap-1"><Trophy size={14} /> {g.winner_count} vincitore/i</p>
              <p className="text-dark-300 flex items-center gap-1"><Clock size={14} /> {g.is_ended ? 'Terminato' : `Finisce: ${formatDateTime(g.ends_at)}`}</p>
              {g.required_role_id && <p className="text-dark-300">🔒 Ruolo richiesto</p>}
            </div>
            <div className="mt-3 pt-3 border-t border-dark-800 flex items-center justify-between">
              <span className={`badge ${g.is_ended ? 'bg-dark-700 text-dark-400' : 'bg-green-500/20 text-green-400'}`}>{g.is_ended ? 'Terminato' : 'Attivo'}</span>
              {!g.is_ended && <button onClick={() => endGiveaway(g.id)} className="btn-secondary text-sm px-3 py-1">Termina ora</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
