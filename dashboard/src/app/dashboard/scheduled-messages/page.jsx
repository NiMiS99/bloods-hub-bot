'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Clock, Plus, Trash2, X, Check, Zap } from 'lucide-react';

export default function ScheduledMessagesPage() {
  const { guild } = useGuild();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ channelId: '', content: '', embedTitle: '', embedImage: '', cronExpr: '' });

  useEffect(() => { if (guild) loadMessages(); }, [guild]);

  async function loadMessages() {
    const { messages } = await api.getScheduledMessages(guild.id);
    setMessages(messages);
    setLoading(false);
  }

  async function createMessage() {
    if (!form.channelId || !form.content || !form.cronExpr) return;
    await api.createScheduledMessage(guild.id, form);
    setForm({ channelId: '', content: '', embedTitle: '', embedImage: '', cronExpr: '' });
    setShowAdd(false);
    loadMessages();
  }

  async function toggleMessage(id) {
    await api.toggleScheduledMessage(guild.id, id);
    loadMessages();
  }

  async function deleteMessage(id) {
    if (!confirm('Eliminare questo messaggio programmato?')) return;
    await api.deleteScheduledMessage(guild.id, id);
    loadMessages();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{messages.length} messaggi programmati</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Nuovo messaggio</button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo messaggio programmato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm text-dark-300 mb-1 block">ID Canale Discord</label><input className="input" value={form.channelId} onChange={(e) => setForm({ ...form, channelId: e.target.value })} placeholder="123456789012345678" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Espressione Cron</label><input className="input" value={form.cronExpr} onChange={(e) => setForm({ ...form, cronExpr: e.target.value })} placeholder="0 9 * * * (ogni giorno alle 9:00)" /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">Titolo Embed (opzionale)</label><input className="input" value={form.embedTitle} onChange={(e) => setForm({ ...form, embedTitle: e.target.value })} /></div>
            <div><label className="text-sm text-dark-300 mb-1 block">URL Immagine Embed (opzionale)</label><input className="input" value={form.embedImage} onChange={(e) => setForm({ ...form, embedImage: e.target.value })} /></div>
          </div>
          <div><label className="text-sm text-dark-300 mb-1 block">Contenuto</label><textarea className="input min-h-[80px]" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Buongiorno community!" /></div>
          <div className="text-xs text-dark-400">
            <p>Formato cron: <code className="bg-dark-800 px-1 rounded">minuto ora giorno-mese mese giorno-settimana</code></p>
            <p>Esempi: <code className="bg-dark-800 px-1 rounded">0 9 * * *</code> (9:00 ogni giorno) · <code className="bg-dark-800 px-1 rounded">*/30 * * * *</code> (ogni 30 min) · <code className="bg-dark-800 px-1 rounded">0 18 * * 5</code> (venerdì 18:00)</p>
          </div>
          <div className="flex gap-2"><button onClick={createMessage} className="btn-primary">Crea</button><button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-dark-400">
            <Clock size={32} className="mx-auto mb-3 opacity-50" />
            <p>Nessun messaggio programmato. Creane uno!</p>
          </div>
        ) : messages.map((m) => (
          <div key={m.id} className={`card p-5 ${!m.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-bloods-500" />
                <code className="text-sm bg-dark-800 px-2 py-0.5 rounded text-bloods-400">{m.cron_expr}</code>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleMessage(m.id)} className="p-1.5 hover:bg-dark-800 rounded-lg" title={m.is_active ? 'Disattiva' : 'Attiva'}>
                  {m.is_active ? <Zap size={16} className="text-green-400" /> : <Zap size={16} className="text-dark-400" />}
                </button>
                <button onClick={() => deleteMessage(m.id)} className="p-1.5 hover:bg-dark-800 rounded-lg"><Trash2 size={16} className="text-dark-400 hover:text-red-400" /></button>
              </div>
            </div>
            {m.embed_title && <h3 className="font-semibold text-white mb-2">{m.embed_title}</h3>}
            <p className="text-sm text-dark-300 mb-3 line-clamp-3">{m.content}</p>
            <div className="space-y-1 text-sm">
              <p className="text-dark-300">📍 Canale: <code className="text-xs">{m.channel_id}</code></p>
            </div>
            <div className="mt-3 pt-3 border-t border-dark-800">
              <span className={`badge ${m.is_active ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>{m.is_active ? 'Attivo' : 'Disattivato'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
