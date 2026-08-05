'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Activity, TrendingUp, MessageSquare, Mic } from 'lucide-react';

export default function ActivityPage() {
  const { guild } = useGuild();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => { if (guild) load(); }, [guild, days]);

  async function load() {
    const d = await api.getAnalytics(guild.id, days);
    setData(d);
    setLoading(false);
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  const activity = data.activity || [];
  const maxMsg = Math.max(...activity.map(a => a.messages || 0), 1);
  const maxVoice = Math.max(...activity.map(a => a.voice || 0), 1);

  const totalMessages = activity.reduce((s, a) => s + (a.messages || 0), 0);
  const totalVoice = activity.reduce((s, a) => s + (a.voice || 0), 0);
  const avgMsgPerDay = Math.round(totalMessages / (activity.length || 1));
  const avgVoicePerDay = Math.round(totalVoice / (activity.length || 1));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6" /> Activity Log
      </h1>

      <div className="flex gap-2 mb-6">
        {[7, 30, 90, 365].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm ${days === d ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            {d === 365 ? '1 anno' : `${d} giorni`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} label="Messaggi totali" value={totalMessages.toLocaleString()} color="text-blue-400" />
        <StatCard icon={MessageSquare} label="Media/giorno" value={avgMsgPerDay.toLocaleString()} color="text-blue-400" />
        <StatCard icon={Mic} label="Secondi vocali" value={totalVoice.toLocaleString()} color="text-green-400" />
        <StatCard icon={Mic} label="Media/giorno" value={avgVoicePerDay.toLocaleString()} color="text-green-400" />
      </div>

      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Attività giornaliera
        </h2>
        <div className="space-y-1">
          {activity.slice(-30).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 w-24">{new Date(a.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
              <div className="flex-1 flex gap-1">
                <div className="flex-1 bg-zinc-800 rounded h-5 relative">
                  <div className="bg-blue-500 rounded h-5" style={{ width: `${(a.messages / maxMsg) * 100}%` }} />
                  <span className="absolute left-2 top-0 text-white text-xs leading-5">{a.messages || 0}</span>
                </div>
                <div className="flex-1 bg-zinc-800 rounded h-5 relative">
                  <div className="bg-green-500 rounded h-5" style={{ width: `${(a.voice / maxVoice) * 100}%` }} />
                  <span className="absolute left-2 top-0 text-white text-xs leading-5">{a.voice || 0}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Messaggi</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Secondi vocali</span>
        </div>
      </div>

      {data.gameDistribution && data.gameDistribution.length > 0 && (
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          <h2 className="text-white font-semibold mb-4">Distribuzione giochi</h2>
          <div className="space-y-2">
            {data.gameDistribution.map((g, i) => {
              const max = Math.max(...data.gameDistribution.map(x => x.count), 1);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-zinc-300 text-sm w-32">{g['Game.name'] || g.game_id}</span>
                  <div className="flex-1 bg-zinc-800 rounded h-5 relative">
                    <div className="rounded h-5" style={{ width: `${(g.count / max) * 100}%`, backgroundColor: g['Game.color_hex'] || '#8b0000' }} />
                    <span className="absolute left-2 top-0 text-white text-xs leading-5">{g.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <p className="text-zinc-400 text-xs">{label}</p>
      <p className="text-white text-lg font-bold">{value}</p>
    </div>
  );
}
