'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { BarChart3, Activity, Users, Gamepad2, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import ApiError from '@/components/dashboard/ApiError';

const COLORS = ['#8b0000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function AnalyticsPage() {
  const { guild } = useGuild();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    api.getAnalytics(guild.id, days).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, [guild, days]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (error) return <ApiError />;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Time range */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${days === d ? 'bg-gradient-to-r from-bloods-800 to-bloods-900 text-white' : 'bg-dark-800 text-dark-300 hover:text-white'}`}>
            {d} giorni
          </button>
        ))}
      </div>

      {/* Activity chart */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Activity size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Attività nel tempo</h3></div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.activity}>
            <defs>
              <linearGradient id="cMsg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
              <linearGradient id="cVoice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="date" stroke="#5c6788" fontSize={11} tickFormatter={(v) => v?.slice(5)} />
            <YAxis stroke="#5c6788" fontSize={11} />
            <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="messages" stroke="#22c55e" fill="url(#cMsg)" name="Messaggi" />
            <Area type="monotone" dataKey="voice" stroke="#a855f7" fill="url(#cVoice)" name="Voice" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><Gamepad2 size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Distribuzione giochi</h3></div>
          {data.gameDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.gameDistribution} dataKey="count" nameKey="game" cx="50%" cy="50%" outerRadius={100} label>
                  {data.gameDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[280px] flex items-center justify-center text-dark-400">Nessun dato</div>}
        </div>

        {/* Level distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Distribuzione livelli</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.levelDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="level" stroke="#5c6788" fontSize={11} tickFormatter={(v) => `Lv${v}`} />
              <YAxis stroke="#5c6788" fontSize={11} />
              <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#8b0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Member growth */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-bloods-500" /><h3 className="font-semibold text-white">Crescita membri</h3></div>
        {data.memberGrowth.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.memberGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="date" stroke="#5c6788" fontSize={11} tickFormatter={(v) => v?.slice(5)} />
              <YAxis stroke="#5c6788" fontSize={11} />
              <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="h-[200px] flex items-center justify-center text-dark-400">Nessun nuovo membro nel periodo selezionato</div>}
      </div>
    </div>
  );
}
