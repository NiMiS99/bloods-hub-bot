'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Mic, Users, Circle } from 'lucide-react';
import { fetchPublic } from '@/lib/siteConfig';

export default function DiscordWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublic('/discord-widget')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="text-gold-400" size={20} />
          <h3 className="text-lg font-bold text-white">Discord Live</h3>
        </div>
        <div className="space-y-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (!data || (data.online === 0 && data.voiceChannels.length === 0)) {
    return null;
  }

  const statusColors = {
    online: 'text-green-400',
    idle: 'text-yellow-400',
    dnd: 'text-red-400',
  };

  return (
    <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white inline-flex items-center gap-2">
          <MessageCircle className="text-gold-400" size={20} /> Discord Live
        </h3>
        <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
          <Circle size={8} className="fill-current animate-pulse" />
          {data.online} online
        </span>
      </div>

      {/* Voice Channels */}
      {data.voiceChannels.length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-2 inline-flex items-center gap-1">
            <Mic size={12} /> Canali vocali attivi
          </p>
          {data.voiceChannels.slice(0, 5).map((ch, i) => (
            <div key={i} className="rounded-lg border border-dark-800 bg-dark-950/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{ch.name}</span>
                <span className="text-xs text-dark-400">{ch.memberCount} {ch.memberCount === 1 ? 'utente' : 'utenti'}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ch.members.slice(0, 8).map((m, j) => (
                  <img
                    key={j}
                    src={m.avatar}
                    alt={m.username}
                    title={m.username}
                    className="h-6 w-6 rounded-full border border-dark-700"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Online Members */}
      {data.members.length > 0 && (
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider mb-2 inline-flex items-center gap-1">
            <Users size={12} /> Membri online
          </p>
          <div className="flex flex-wrap gap-2">
            {data.members.slice(0, 20).map((m, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 rounded-full border border-dark-800 bg-dark-950/60 px-2 py-1">
                <img src={m.avatar} alt="" className="h-5 w-5 rounded-full" />
                <span className="text-xs text-dark-200 max-w-[100px] truncate">{m.username}</span>
                <Circle size={6} className={`fill-current ${statusColors[m.status] || 'text-green-400'}`} />
              </div>
            ))}
            {data.members.length > 20 && (
              <span className="text-xs text-dark-400 self-center">+{data.members.length - 20}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
