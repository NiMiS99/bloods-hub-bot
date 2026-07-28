'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { timeAgo } from '@/lib/utils';
import { Gift, Plus, Trash2, Crown, Star, Award } from 'lucide-react';

export default function LevelRewardsPage() {
  const { guild } = useGuild();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ level: '', roleId: '', message: '' });
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!guild) return;
    Promise.all([
      api.getLevelRewards(guild.id),
      api.getSettings(guild.id),
    ]).then(([r, s]) => {
      setRewards(r.rewards || []);
      setRoles(s.discord?.roles || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [guild]);

  async function addReward() {
    if (!guild || !form.level) return;
    try {
      await api.addLevelReward(guild.id, {
        level: parseInt(form.level),
        roleId: form.roleId || null,
        message: form.message || null,
      });
      const r = await api.getLevelRewards(guild.id);
      setRewards(r.rewards || []);
      setForm({ level: '', roleId: '', message: '' });
      setShowAdd(false);
    } catch (e) { alert(e.message); }
  }

  async function deleteReward(id) {
    if (!guild || !confirm('Eliminare questa ricompensa?')) return;
    try {
      await api.deleteLevelReward(guild.id, id);
      setRewards(rewards.filter((r) => r.id !== id));
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="spinner mx-auto mt-20" />;
  if (!guild) return <p className="text-dark-400">Seleziona un server.</p>;

  const levelIcon = (level) => {
    if (level >= 25) return <Crown className="text-yellow-400" size={24} />;
    if (level >= 10) return <Star className="text-purple-400" size={24} />;
    return <Award className="text-bloods-400" size={24} />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="text-bloods-400" /> Ricompense Livelli
          </h1>
          <p className="text-dark-400 text-sm mt-1">Assegna ruoli automaticamente quando un utente raggiunge un livello</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuova Ricompensa
        </button>
      </div>

      {showAdd && (
        <div className="card p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Aggiungi Ricompensa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Livello</label>
              <input type="number" min="1" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="input-field" placeholder="es. 10" />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Ruolo</label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                className="input-field">
                <option value="">Nessun ruolo</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Messaggio (opzionale)</label>
              <input type="text" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="input-field" placeholder="🎉 {user} ha raggiunto il livello {level}!" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addReward} className="btn-primary">Salva</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      )}

      {rewards.length === 0 ? (
        <div className="card p-12 text-center">
          <Gift size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">Nessuna ricompensa configurata.</p>
          <p className="text-dark-500 text-sm mt-1">Crea una ricompensa per assegnare ruoli automaticamente al raggiungimento di un livello.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((r) => (
            <div key={r.id} className="card p-5 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {levelIcon(r.level)}
                  <div>
                    <p className="text-white font-bold text-lg">Livello {r.level}</p>
                    <p className="text-dark-400 text-sm">{r.roleName}</p>
                  </div>
                </div>
                <button onClick={() => deleteReward(r.id)} className="text-dark-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={18} />
                </button>
              </div>
              {r.message && (
                <p className="text-dark-300 text-sm mt-3 italic">&quot;{r.message}&quot;</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
