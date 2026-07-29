'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Settings, Save, Server, Zap, UserPlus, Bot, Mic, TrendingUp } from 'lucide-react';

export default function SettingsPage() {
  const { guild } = useGuild();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!guild) return;
    api.getSettings(guild.id).then((d) => {
      setData(d);
      if (d.guild) {
        setForm({
          xpEnabled: d.guild.xpEnabled,
          xpPerMessage: d.guild.xpPerMessage,
          xpPerVoiceMinute: d.guild.xpPerVoiceMinute,
          xpCooldownSeconds: d.guild.xpCooldownSeconds,
          welcomeChannelId: d.guild.welcomeChannelId || '',
          logChannelId: d.guild.logChannelId || '',
          announcementsChannelId: d.guild.announcementsChannelId || '',
          language: d.guild.language || 'it',
          welcomeEnabled: d.guild.welcomeEnabled || false,
          welcomeMessage: d.guild.welcomeMessage || 'Benvenuto {user} in **{server}**!',
          welcomeImageEnabled: d.guild.welcomeImageEnabled ?? true,
          autoRoleId: d.guild.autoRoleId || '',
          levelRewardChannelId: d.guild.levelRewardChannelId || '',
          levelUpChannelId: d.guild.levelUpChannelId || '',
          levelUpMessage: d.guild.levelUpMessage || '🎉 **{user}** ha raggiunto il livello **{level}**!',
          automodEnabled: d.guild.automodEnabled || false,
          automodLogChannelId: d.guild.automodLogChannelId || '',
          tempVoiceCreatorChannelId: d.guild.tempVoiceCreatorChannelId || '',
        });
      }
      setLoading(false);
    });
  }, [guild]);

  async function save() {
    setSaving(true);
    try {
      await api.updateSettings(guild.id, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Errore: ' + err.message);
    }
    setSaving(false);
  }

  function Toggle({ value, onClick }) {
    return (
      <button type="button" onClick={onClick} className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-bloods-700' : 'bg-dark-700'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    );
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Discord info */}
      {data?.discord && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Server size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Info Server</h3></div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-dark-400">Nome</p><p className="text-white font-medium">{data.discord.name}</p></div>
            <div><p className="text-dark-400">Membri</p><p className="text-white font-medium">{data.discord.memberCount}</p></div>
            <div><p className="text-dark-400">Categorie</p><p className="text-white font-medium">{data.discord.channels.categories}</p></div>
            <div><p className="text-dark-400">Canali testuali</p><p className="text-white font-medium">{data.discord.channels.text}</p></div>
            <div><p className="text-dark-400">Canali vocali</p><p className="text-white font-medium">{data.discord.channels.voice}</p></div>
            <div><p className="text-dark-400">Owner ID</p><p className="text-white font-mono text-xs">{data.discord.ownerId}</p></div>
          </div>
        </div>
      )}

      {/* XP Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-yellow-500" /><h3 className="font-semibold text-white">Sistema XP</h3></div>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-dark-300">XP attivo</span>
            <Toggle value={form.xpEnabled} onClick={() => setForm({ ...form, xpEnabled: !form.xpEnabled })} />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">XP per messaggio</label>
              <input type="number" className="input" value={form.xpPerMessage ?? 1} onChange={(e) => setForm({ ...form, xpPerMessage: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">XP per minuto vocale</label>
              <input type="number" className="input" value={form.xpPerVoiceMinute ?? 5} onChange={(e) => setForm({ ...form, xpPerVoiceMinute: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Cooldown (secondi)</label>
              <input type="number" className="input" value={form.xpCooldownSeconds ?? 60} onChange={(e) => setForm({ ...form, xpCooldownSeconds: parseInt(e.target.value) })} />
            </div>
          </div>
        </div>
      </div>

      {/* Level-Up Settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-blue-500" /><h3 className="font-semibold text-white">Annunci Level-Up</h3></div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale annunci level-up</label>
            <select className="input" value={form.levelUpChannelId ?? ''} onChange={(e) => setForm({ ...form, levelUpChannelId: e.target.value })}>
              <option value="">Disabilitato (nessun annuncio)</option>
              {data?.discord?.channels?.textChannels?.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
            <p className="text-xs text-dark-500 mt-1">Canale dove annunciare quando un utente sale di livello. Lascia vuoto per disabilitare.</p>
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Messaggio level-up</label>
            <input className="input" value={form.levelUpMessage ?? ''} onChange={(e) => setForm({ ...form, levelUpMessage: e.target.value })} placeholder="🎉 **{user}** ha raggiunto il livello **{level}**!" />
            <p className="text-xs text-dark-500 mt-1">Variabili: {'{user}'} = nome utente, {'{level}'} = livello raggiunto</p>
          </div>
        </div>
      </div>

      {/* Welcome */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><UserPlus size={18} className="text-green-500" /><h3 className="font-semibold text-white">Sistema Benvenuto</h3></div>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-dark-300">Benvenuto attivo</span>
            <Toggle value={form.welcomeEnabled} onClick={() => setForm({ ...form, welcomeEnabled: !form.welcomeEnabled })} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-dark-300">Card immagine</span>
            <Toggle value={form.welcomeImageEnabled} onClick={() => setForm({ ...form, welcomeImageEnabled: !form.welcomeImageEnabled })} />
          </label>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Messaggio benvenuto</label>
            <input className="input" value={form.welcomeMessage ?? ''} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} placeholder="Benvenuto {user} in **{server}**!" />
            <p className="text-xs text-dark-500 mt-1">Variabili: {'{user}'} = menzione, {'{server}'} = nome server, {'{count}'} = numero membri</p>
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Ruolo automatico all&apos;ingresso</label>
            <select className="input" value={form.autoRoleId ?? ''} onChange={(e) => setForm({ ...form, autoRoleId: e.target.value })}>
              <option value="">Nessun ruolo automatico</option>
              {data?.discord?.roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Automod settings */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Bot size={18} className="text-purple-500" /><h3 className="font-semibold text-white">Auto-Mod</h3></div>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-dark-300">Auto-mod attiva</span>
            <Toggle value={form.automodEnabled} onClick={() => setForm({ ...form, automodEnabled: !form.automodEnabled })} />
          </label>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale log automod (ID)</label>
            <input className="input font-mono text-sm" value={form.automodLogChannelId ?? ''} onChange={(e) => setForm({ ...form, automodLogChannelId: e.target.value })} placeholder="123456789012345678" />
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale ricompense livello (ID)</label>
            <input className="input font-mono text-sm" value={form.levelRewardChannelId ?? ''} onChange={(e) => setForm({ ...form, levelRewardChannelId: e.target.value })} placeholder="123456789012345678" />
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Settings size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Canali</h3></div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale benvenuto (ID)</label>
            <input className="input font-mono text-sm" value={form.welcomeChannelId ?? ''} onChange={(e) => setForm({ ...form, welcomeChannelId: e.target.value })} placeholder="123456789012345678" />
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale log (ID)</label>
            <input className="input font-mono text-sm" value={form.logChannelId ?? ''} onChange={(e) => setForm({ ...form, logChannelId: e.target.value })} placeholder="123456789012345678" />
          </div>
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale annunci (ID)</label>
            <input className="input font-mono text-sm" value={form.announcementsChannelId ?? ''} onChange={(e) => setForm({ ...form, announcementsChannelId: e.target.value })} placeholder="123456789012345678" />
          </div>
        </div>
      </div>

      {/* Temp Voice */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Mic size={18} className="text-blue-500" /><h3 className="font-semibold text-white">Canali Vocali Temporanei</h3></div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-300 mb-1 block">Canale creatore (ID)</label>
            <input className="input font-mono text-sm" value={form.tempVoiceCreatorChannelId ?? ''} onChange={(e) => setForm({ ...form, tempVoiceCreatorChannelId: e.target.value })} placeholder="123456789012345678" />
            <p className="text-xs text-dark-500 mt-1">Gli utenti che entrano in questo canale ricevono un canale vocale privato automatico.</p>
          </div>
          <p className="text-xs text-dark-400">Lascia vuoto per disattivare. Usa <code className="bg-dark-800 px-1 rounded">/tempvc setup</code> su Discord per configurare.</p>
        </div>
      </div>

      {/* Language */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-4">Lingua</h3>
        <select className="input" value={form.language ?? 'it'} onChange={(e) => setForm({ ...form, language: e.target.value })}>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} /> {saving ? 'Salvando...' : 'Salva impostazioni'}
        </button>
        {saved && <span className="text-green-400 text-sm animate-fade-in">✓ Salvato!</span>}
      </div>
    </div>
  );
}
