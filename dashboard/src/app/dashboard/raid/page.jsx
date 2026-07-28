'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { timeAgo } from '@/lib/utils';
import { Swords, Shield, CheckCircle, XCircle, Settings, RefreshCw } from 'lucide-react';

export default function RaidPage() {
  const { guild } = useGuild();
  const [config, setConfig] = useState(null);
  const [eligibility, setEligibility] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!guild) return;
    Promise.all([
      api.getRaidConfig(guild.id),
      api.getRaidEligibility(guild.id),
      api.getRaidStats(guild.id),
    ]).then(([c, e, s]) => {
      setConfig(c.config);
      setEligibility(e.eligibility || []);
      setStats(s.stats);
      if (c.config) setForm(c.config);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [guild]);

  async function saveConfig() {
    if (!guild) return;
    try {
      const r = await api.updateRaidConfig(guild.id, form);
      setConfig(r.config);
      setEditing(false);
    } catch (e) { alert(e.message); }
  }

  async function refresh() {
    if (!guild) return;
    setLoading(true);
    const [e, s] = await Promise.all([api.getRaidEligibility(guild.id), api.getRaidStats(guild.id)]);
    setEligibility(e.eligibility || []);
    setStats(s.stats);
    setLoading(false);
  }

  if (loading) return <div className="p-8 text-center text-zinc-400">Caricamento...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Swords className="w-6 h-6 text-red-700" />
          Raid & Progress
        </h1>
        <button onClick={refresh} className="p-2 text-zinc-400 hover:text-white">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-sm text-zinc-500">Idonei</div>
            <div className="text-2xl font-bold text-green-500">{stats.eligible}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-sm text-zinc-500">Non idonei</div>
            <div className="text-2xl font-bold text-red-500">{stats.ineligible}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-sm text-zinc-500">Ilvl minimo</div>
            <div className="text-2xl font-bold text-white">{stats.minIlvl}</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-sm text-zinc-500">Presenze totali</div>
            <div className="text-2xl font-bold text-white">{stats.totalAttendance}</div>
          </div>
        </div>
      )}

      {/* Config */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" />
            Configurazione Raid
          </h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm text-red-700 hover:text-red-500">
              Modifica
            </button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-zinc-500">Ilvl minimo:</span> <span className="text-white">{config?.minIlvl || 0}</span></div>
            <div><span className="text-zinc-500">Tier richiesto:</span> <span className="text-white">{config?.requireTierBonus ? 'Si' : 'No'}</span></div>
            <div><span className="text-zinc-500">Orario:</span> <span className="text-white">{config?.raidTime || '21:00'}</span></div>
            <div><span className="text-zinc-500">Giorni:</span> <span className="text-white">{(config?.raidDays || []).join(', ')}</span></div>
            <div><span className="text-zinc-500">Presenze min:</span> <span className="text-white">{config?.minRaidAttendance || 0}</span></div>
            <div><span className="text-zinc-500">Achievement:</span> <span className="text-white">{config?.requireAchievement || 'Nessuno'}</span></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-500">Ilvl minimo</label>
              <input type="number" value={form.minIlvl ?? 0} onChange={(e) => setForm({ ...form, minIlvl: parseInt(e.target.value) })}
                className="w-full bg-zinc-800 text-white rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Orario raid</label>
              <input type="text" value={form.raidTime ?? '21:00'} onChange={(e) => setForm({ ...form, raidTime: e.target.value })}
                className="w-full bg-zinc-800 text-white rounded px-3 py-2 mt-1" />
            </div>
            <div>
              <label className="text-sm text-zinc-500">Presenze minime</label>
              <input type="number" value={form.minRaidAttendance ?? 0} onChange={(e) => setForm({ ...form, minRaidAttendance: parseInt(e.target.value) })}
                className="w-full bg-zinc-800 text-white rounded px-3 py-2 mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="tierBonus" checked={form.requireTierBonus ?? false} onChange={(e) => setForm({ ...form, requireTierBonus: e.target.checked })}
                className="rounded" />
              <label htmlFor="tierBonus" className="text-sm text-white">Richiedi tier set bonus</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveConfig} className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700">Salva</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600">Annulla</button>
            </div>
          </div>
        )}
      </div>

      {/* Eligibility table */}
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-4">Idoneita Membri</h2>
        {eligibility.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nessun dato di idoneita. Usa <code className="text-red-700">/raidstatus check</code> in Discord.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-2">Membro</th>
                  <th className="text-center py-2">Idoneo</th>
                  <th className="text-center py-2">Ilvl</th>
                  <th className="text-center py-2">Tier</th>
                  <th className="text-center py-2">Presenze</th>
                  <th className="text-left py-2">Motivi</th>
                  <th className="text-right py-2">Ultimo check</th>
                </tr>
              </thead>
              <tbody>
                {eligibility.map((e, i) => (
                  <tr key={i} className="border-b border-zinc-800/50">
                    <td className="py-2 text-white">{e.username}</td>
                    <td className="text-center py-2">
                      {e.isEligible
                        ? <CheckCircle className="w-4 h-4 text-green-500 inline" />
                        : <XCircle className="w-4 h-4 text-red-500 inline" />}
                    </td>
                    <td className="text-center py-2 text-zinc-300">{e.ilvl || '—'}</td>
                    <td className="text-center py-2 text-zinc-300">{e.tierBonus ? 'Si' : 'No'}</td>
                    <td className="text-center py-2 text-zinc-300">{e.attendance || 0}</td>
                    <td className="py-2 text-zinc-500 text-xs">{(e.failureReasons || []).join(', ') || '—'}</td>
                    <td className="text-right py-2 text-zinc-500 text-xs">{e.lastChecked ? timeAgo(e.lastChecked) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
