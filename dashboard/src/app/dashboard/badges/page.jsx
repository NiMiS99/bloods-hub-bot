'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { timeAgo } from '@/lib/utils';
import { Award } from 'lucide-react';
import ApiError from '@/components/dashboard/ApiError';

export default function BadgesPage() {
  const { guild } = useGuild();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!guild) return;
    api.getBadges(guild.id).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, [guild]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (error) return <ApiError />;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Badge grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.badges.map((b) => (
          <div key={b.code} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center text-2xl">{b.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{b.name}</h3>
                <p className="text-xs text-dark-400">{b.code}</p>
              </div>
              <span className="badge bg-yellow-500/20 text-yellow-400">{b.awardedCount}</span>
            </div>
            <p className="text-sm text-dark-300">{b.description}</p>
          </div>
        ))}
      </div>

      {/* Recent awards */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-dark-800"><Award size={18} className="text-yellow-500" /><h3 className="font-semibold text-white">Badge assegnati di recente</h3></div>
        {data.recentAwards.length === 0 ? (
          <div className="p-12 text-center text-dark-400"><Award size={32} className="mx-auto mb-3 opacity-50" /><p>Nessun badge assegnato.</p></div>
        ) : (
          <div className="divide-y divide-dark-800">
            {data.recentAwards.map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                {a.avatar ? <img src={a.avatar} alt="" className="w-9 h-9 rounded-full" /> : <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center text-sm font-bold">{a.username?.[0]}</div>}
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{a.username}</p>
                  <p className="text-xs text-dark-400">Badge: {a.badgeCode}</p>
                </div>
                <span className="text-xs text-dark-500">{timeAgo(a.awardedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
