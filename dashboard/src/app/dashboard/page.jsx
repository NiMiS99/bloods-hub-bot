'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { formatNumber, formatDuration } from '@/lib/utils';
import {
  Users, MessageSquare, Mic, Gamepad2, Trophy, Award,
  Calendar, Shield, TrendingUp, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#8b0000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export default function DashboardHome() {
  const { guild } = useGuild();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guild) return;
    Promise.all([
      api.getGuild(guild.id),
      api.getAnalytics(guild.id, 30),
    ]).then(([g, a]) => {
      setData(g);
      setAnalytics(a);
    }).finally(() => setLoading(false));
  }, [guild]);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;
  if (!data) return <div className="text-center text-dark-400 py-20">Errore caricamento dati</div>;

  const stats = data.stats;

  const statCards = [
    { label: 'Membri tracciati', value: formatNumber(stats.totalUsers), icon: Users, color: 'from-blue-500 to-blue-700' },
    { label: 'Messaggi totali', value: formatNumber(stats.totalMessages), icon: MessageSquare, color: 'from-green-500 to-green-700' },
    { label: 'Tempo vocale', value: formatDuration(stats.totalVoice), icon: Mic, color: 'from-purple-500 to-purple-700' },
    { label: 'Giochi attivi', value: stats.games, icon: Gamepad2, color: 'from-orange-500 to-orange-700' },
    { label: 'Iscrizioni', value: stats.memberships, icon: Trophy, color: 'from-yellow-500 to-yellow-700' },
    { label: 'Badge assegnati', value: stats.badges, icon: Award, color: 'from-pink-500 to-pink-700' },
    { label: 'Eventi attivi', value: stats.events, icon: Calendar, color: 'from-cyan-500 to-cyan-700' },
    { label: 'Warning', value: stats.warnings, icon: Shield, color: 'from-red-500 to-red-700' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="card p-6 bg-gradient-to-r from-dark-850 to-dark-900 border-bloods-800/30">
        <div className="flex items-center gap-4">
          {guild.icon ? (
            <img src={guild.icon} alt="" className="w-16 h-16 rounded-2xl" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bloods-700 to-bloods-900 flex items-center justify-center text-2xl font-bold text-white">
              {guild.name?.[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{guild.name}</h1>
            <p className="text-dark-400">{formatNumber(guild.memberCount)} membri • {stats.legacyUsers} membri WoW legacy</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-dark-400 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-bloods-500" />
            <h3 className="font-semibold text-white">Attività (30 giorni)</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analytics?.activity || []}>
              <defs>
                <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVoice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="date" stroke="#5c6788" fontSize={11} tickFormatter={(v) => v?.slice(5)} />
              <YAxis stroke="#5c6788" fontSize={11} />
              <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="messages" stroke="#22c55e" fill="url(#colorMsg)" name="Messaggi" />
              <Area type="monotone" dataKey="voice" stroke="#a855f7" fill="url(#colorVoice)" name="Voice" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Game distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 size={18} className="text-bloods-500" />
            <h3 className="font-semibold text-white">Distribuzione giochi</h3>
          </div>
          {analytics?.gameDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={analytics.gameDistribution} dataKey="count" nameKey="game" cx="50%" cy="50%" outerRadius={90} label>
                  {analytics.gameDistribution.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#aab2c5' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-dark-400 text-sm">
              Nessun dato. Promuovi il pannello di selezione giochi!
            </div>
          )}
        </div>
      </div>

      {/* Top 10 + Level distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-bloods-500" />
            <h3 className="font-semibold text-white">Top 10 per XP</h3>
          </div>
          <div className="space-y-2">
            {analytics?.topXp?.map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800 transition-colors">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-bloods-800 text-white' : 'bg-dark-700 text-dark-300'}`}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-white truncate">{u.username}</span>
                <span className="text-sm font-semibold text-bloods-400">Lv {u.level}</span>
                <span className="text-sm text-dark-400">{formatNumber(u.xp)} XP</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-bloods-500" />
            <h3 className="font-semibold text-white">Distribuzione livelli</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics?.levelDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="level" stroke="#5c6788" fontSize={11} tickFormatter={(v) => `Lv${v}`} />
              <YAxis stroke="#5c6788" fontSize={11} />
              <Tooltip contentStyle={{ background: '#151523', border: '1px solid #2a2a3e', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#8b0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
