'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatNumber, formatDuration } from '@/lib/utils';
import { Trophy } from 'lucide-react';

const METRICS = [
  { value: 'xp', label: 'XP' },
  { value: 'total_messages', label: 'Messaggi' },
  { value: 'total_voice_seconds', label: 'Tempo vocale' },
];

export default function LeaderboardPage() {
  const { guild } = useGuild();
  const [metric, setMetric] = useState('xp');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    api.getLeaderboard(guild.id, metric).then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });
  }, [guild, metric]);

  const formatValue = (v) => {
    if (metric === 'total_voice_seconds') return formatDuration(v);
    return formatNumber(v);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metric selector */}
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <button key={m.value} onClick={() => setMetric(m.value)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${metric === m.value ? 'bg-gradient-to-r from-bloods-800 to-bloods-900 text-white' : 'bg-dark-800 text-dark-300 hover:text-white'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-dark-400"><Trophy size={32} className="mx-auto mb-3 opacity-50" /><p>Nessun dato per questa classifica.</p></div>
        ) : (
          <div className="divide-y divide-dark-800">
            {entries.map((e, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-dark-800/30 transition-colors">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-700/20 text-orange-500' : 'bg-dark-700 text-dark-300'}`}>
                  {i + 1}
                </span>
                {e.avatar ? <img src={e.avatar} alt="" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold">{e.username?.[0]}</div>}
                <span className="flex-1 text-white font-medium">{e.username}</span>
                <span className="text-lg font-bold text-bloods-400">{formatValue(e.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
