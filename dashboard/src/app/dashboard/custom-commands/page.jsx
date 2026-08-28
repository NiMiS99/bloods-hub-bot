'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { TerminalSquare, Plus, Trash2, X } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function CustomCommandsPage() {
  const { guild } = useGuild();
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', response: '', embedTitle: '', embedImage: '' });

  useEffect(() => { if (guild) loadCommands(); }, [guild]);

  async function loadCommands() {
    const { commands } = await api.getCustomCommands(guild.id);
    setCommands(commands);
    setLoading(false);
  }

  async function createCommand() {
    if (!form.name || !form.response) return;
    await api.createCustomCommand(guild.id, form);
    setForm({ name: '', response: '', embedTitle: '', embedImage: '' });
    setShowAdd(false);
    loadCommands();
  }

  async function deleteCommand(id) {
    if (!confirm('Eliminare questo comando?')) return;
    await api.deleteCustomCommand(guild.id, id);
    loadCommands();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{commands.length} comandi personalizzati</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Nuovo comando</button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo comando personalizzato</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Nome comando</label>
              <div className="flex items-center gap-2">
                <span className="text-dark-400">!</span>
                <input className="input flex-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="regole" />
              </div>
              <p className="text-xs text-dark-400 mt-1">Verrà attivato scrivendo <code className="bg-dark-800 px-1 rounded">!{form.name || 'nome'}</code> in chat</p>
            </div>
            <div><label className="text-sm text-dark-300 mb-1 block">Titolo Embed (opzionale)</label><input className="input" value={form.embedTitle} onChange={(e) => setForm({ ...form, embedTitle: e.target.value })} /></div>
          </div>
          <div><label className="text-sm text-dark-300 mb-1 block">Risposta</label><textarea className="input min-h-[100px]" value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} placeholder="Leggi il regolamento in #regolamento" /></div>
          <div><label className="text-sm text-dark-300 mb-1 block">URL Immagine Embed (opzionale)</label><input className="input" value={form.embedImage} onChange={(e) => setForm({ ...form, embedImage: e.target.value })} /></div>
          <div className="flex gap-2"><button onClick={createCommand} className="btn-primary">Crea</button><button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button></div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-800 text-dark-400">
              <th className="text-left p-3 font-medium">Comando</th>
              <th className="text-left p-3 font-medium">Risposta</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Embed</th>
              <th className="text-right p-3 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {commands.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-dark-400">
                <TerminalSquare size={32} className="mx-auto mb-3 opacity-50" />
                <p>Nessun comando personalizzato. Creane uno!</p>
              </td></tr>
            ) : commands.map((c) => (
              <tr key={c.id} className="border-b border-dark-800/50 hover:bg-dark-800/30">
                <td className="p-3"><code className="text-bloods-400 font-mono">!{c.name}</code></td>
                <td className="p-3 text-dark-300 max-w-xs truncate">{c.response}</td>
                <td className="p-3 hidden md:table-cell">{c.embed_title ? <span className="badge bg-bloods-500/20 text-bloods-400">Sì</span> : <span className="text-dark-500">—</span>}</td>
                <td className="p-3 text-right"><button onClick={() => deleteCommand(c.id)} className="p-1.5 hover:bg-dark-800 rounded-lg inline-flex"><Trash2 size={16} className="text-dark-400 hover:text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
