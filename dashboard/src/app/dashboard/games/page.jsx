'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatNumber } from '@/lib/utils';
import { Gamepad2, Plus, Trash2, Edit, X } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function GamesPage() {
  const { guild } = useGuild();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newGame, setNewGame] = useState({ code: '', name: '', apiProvider: 'manual', colorHex: '' });

  useEffect(() => { if (guild) loadGames(); }, [guild]);

  async function loadGames() {
    try {
      setError(false);
      const { games } = await api.getGames(guild.id);
      setGames(games);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function addGame() {
    if (!newGame.code || !newGame.name) return;
    await api.addGame(guild.id, newGame);
    setNewGame({ code: '', name: '', apiProvider: 'manual', colorHex: '' });
    setShowAdd(false);
    loadGames();
  }

  async function toggleGame(code, isActive) {
    await api.updateGame(guild.id, code, { isActive: !isActive });
    loadGames();
  }

  async function removeGame(code) {
    if (!confirm(`Disattivare il gioco "${code}"?`)) return;
    await api.removeGame(guild.id, code);
    loadGames();
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (error) return <ApiError onRetry={loadGames} />;
  if (games.length === 0) return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">0 giochi registrati</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Aggiungi gioco
        </button>
      </div>
      <div className="card p-12 text-center">
        <Gamepad2 size={40} className="mx-auto mb-3 text-dark-600" />
        <p className="text-dark-400">Nessun gioco registrato. Aggiungi il primo gioco con il pulsante sopra.</p>
      </div>
      {showAdd && null}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-dark-400">{games.length} giochi registrati</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Aggiungi gioco
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Nuovo gioco</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Codice (es. valorant)</label>
              <input className="input" value={newGame.code} onChange={(e) => setNewGame({ ...newGame, code: e.target.value.toLowerCase() })} placeholder="valorant" />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Nome</label>
              <input className="input" value={newGame.name} onChange={(e) => setNewGame({ ...newGame, name: e.target.value })} placeholder="Valorant" />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">API Provider</label>
              <select className="input" value={newGame.apiProvider} onChange={(e) => setNewGame({ ...newGame, apiProvider: e.target.value })}>
                <option value="manual">Manuale</option>
                <option value="steam">Steam</option>
                <option value="riot">Riot</option>
                <option value="battlenet">Battle.net</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Colore esadecimale (opzionale)</label>
              <input className="input" value={newGame.colorHex} onChange={(e) => setNewGame({ ...newGame, colorHex: e.target.value })} placeholder="#ff4654" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addGame} className="btn-primary">Crea</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div key={g.id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: g.colorHex || '#8b0000' }}>
                  <Gamepad2 size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{g.name}</h3>
                  <p className="text-xs text-dark-400">{g.code}</p>
                </div>
              </div>
              <span className={`badge ${g.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                {g.isActive ? 'Attivo' : 'Disattivo'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><p className="text-lg font-bold text-white">{g.memberCount}</p><p className="text-xs text-dark-400">membri</p></div>
              <div><p className="text-sm font-medium text-white">{g.apiProvider}</p><p className="text-xs text-dark-400">API</p></div>
              <div><p className="text-sm font-medium text-white">{g.roleId ? '✓' : '—'}</p><p className="text-xs text-dark-400">ruolo</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleGame(g.code, g.isActive)} className="btn-secondary flex-1 text-sm py-1.5">
                {g.isActive ? 'Disattiva' : 'Attiva'}
              </button>
              <button onClick={() => removeGame(g.code)} className="btn-danger px-3 py-1.5">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
