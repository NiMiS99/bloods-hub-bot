'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Bot, Plus, Trash2, Shield, AlertTriangle, Link as LinkIcon, AtSign, Type } from 'lucide-react';

const RULE_TYPES = {
  word_filter: { label: 'Filtro Parole', icon: AlertTriangle, desc: 'Blocca messaggi con parole proibite' },
  spam: { label: 'Anti-Spam', icon: Shield, desc: 'Rileva messaggi ripetuti in poco tempo' },
  link: { label: 'Blocco Link', icon: LinkIcon, desc: 'Blocca link e inviti Discord' },
  mention_spam: { label: 'Menzioni Massa', icon: AtSign, desc: 'Blocca menzioni di massa (@everyone, @here)' },
  caps: { label: 'Eccesso Maiuscole', icon: Type, desc: 'Blocca messaggi in TUTTO MAIUSCOLO' },
};

const ACTIONS = [
  { value: 'delete', label: 'Elimina messaggio' },
  { value: 'warn', label: 'Avvisa + elimina' },
  { value: 'mute', label: 'Muta + elimina' },
  { value: 'kick', label: 'Espelli' },
];

export default function AutomodPage() {
  const { guild } = useGuild();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ruleType: 'word_filter', action: 'delete', threshold: '', words: '', muteDuration: '' });

  useEffect(() => {
    if (!guild) return;
    Promise.all([
      api.getAutomodRules(guild.id),
      api.getSettings(guild.id),
    ]).then(([r, s]) => {
      setRules(r.rules || []);
      setEnabled(s.guild?.automodEnabled || false);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [guild]);

  async function toggleEnabled() {
    if (!guild) return;
    try {
      await api.updateSettings(guild.id, { automodEnabled: !enabled });
      setEnabled(!enabled);
    } catch (e) { alert(e.message); }
  }

  async function addRule() {
    if (!guild) return;
    try {
      const data = {
        ruleType: form.ruleType,
        action: form.action,
        threshold: form.threshold ? parseInt(form.threshold) : null,
        words: form.ruleType === 'word_filter' ? form.words.split(',').map((w) => w.trim()).filter(Boolean) : null,
        muteDuration: form.action === 'mute' && form.muteDuration ? parseInt(form.muteDuration) : null,
      };
      await api.addAutomodRule(guild.id, data);
      const r = await api.getAutomodRules(guild.id);
      setRules(r.rules || []);
      setForm({ ruleType: 'word_filter', action: 'delete', threshold: '', words: '', muteDuration: '' });
      setShowAdd(false);
    } catch (e) { alert(e.message); }
  }

  async function toggleRule(id, currentEnabled) {
    if (!guild) return;
    try {
      await api.updateAutomodRule(guild.id, id, { isEnabled: !currentEnabled });
      setRules(rules.map((r) => r.id === id ? { ...r, isEnabled: !currentEnabled } : r));
    } catch (e) { alert(e.message); }
  }

  async function deleteRule(id) {
    if (!guild || !confirm('Eliminare questa regola?')) return;
    try {
      await api.deleteAutomodRule(guild.id, id);
      setRules(rules.filter((r) => r.id !== id));
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="spinner mx-auto mt-20" />;
  if (!guild) return <p className="text-dark-400">Seleziona un server.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="text-bloods-400" /> Auto-Mod
          </h1>
          <p className="text-dark-400 text-sm mt-1">Moderazione automatica: filtri, anti-spam, blocco link</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-dark-300">Attivo</span>
            <div onClick={toggleEnabled} className={`toggle ${enabled ? 'toggle-on' : ''}`}>
              <div className="toggle-knob" />
            </div>
          </label>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Nuova Regola
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Aggiungi Regola</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Tipo regola</label>
              <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })} className="input-field">
                {Object.entries(RULE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Azione</label>
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="input-field">
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {form.ruleType === 'word_filter' && (
              <div className="md:col-span-2">
                <label className="block text-sm text-dark-300 mb-1">Parole proibite (separate da virgola)</label>
                <input type="text" value={form.words} onChange={(e) => setForm({ ...form, words: e.target.value })}
                  className="input-field" placeholder="parola1, parola2, parola3" />
              </div>
            )}
            {(form.ruleType === 'spam' || form.ruleType === 'mention_spam' || form.ruleType === 'caps') && (
              <div>
                <label className="block text-sm text-dark-300 mb-1">
                  {form.ruleType === 'caps' ? 'Soglia (%)' : 'Soglia (numero)'}
                </label>
                <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                  className="input-field" placeholder={form.ruleType === 'caps' ? '70' : form.ruleType === 'spam' ? '5' : '5'} />
              </div>
            )}
            {form.action === 'mute' && (
              <div>
                <label className="block text-sm text-dark-300 mb-1">Durata mute (minuti)</label>
                <input type="number" value={form.muteDuration} onChange={(e) => setForm({ ...form, muteDuration: e.target.value })}
                  className="input-field" placeholder="10" />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addRule} className="btn-primary">Salva</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Annulla</button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="card p-12 text-center">
          <Bot size={48} className="mx-auto text-dark-600 mb-4" />
          <p className="text-dark-400">Nessuna regola automod configurata.</p>
          <p className="text-dark-500 text-sm mt-1">Crea una regola per moderare automaticamente il server.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => {
            const info = RULE_TYPES[r.ruleType] || { label: r.ruleType, icon: Shield, desc: '' };
            const Icon = info.icon;
            return (
              <div key={r.id} className="card p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${r.isEnabled ? 'bg-bloods-800/30' : 'bg-dark-800'}`}>
                    <Icon size={20} className={r.isEnabled ? 'text-bloods-400' : 'text-dark-600'} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{info.label}</p>
                    <p className="text-dark-400 text-sm">{info.desc}</p>
                    {r.words && r.words.length > 0 && (
                      <p className="text-dark-500 text-xs mt-1">Parole: {r.words.join(', ').substring(0, 80)}</p>
                    )}
                    {r.threshold && <p className="text-dark-500 text-xs mt-1">Soglia: {r.threshold}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-dark-400 px-2 py-1 rounded bg-dark-800">{ACTIONS.find((a) => a.value === r.action)?.label || r.action}</span>
                  <div onClick={() => toggleRule(r.id, r.isEnabled)} className={`toggle ${r.isEnabled ? 'toggle-on' : ''}`}>
                    <div className="toggle-knob" />
                  </div>
                  <button onClick={() => deleteRule(r.id)} className="text-dark-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
