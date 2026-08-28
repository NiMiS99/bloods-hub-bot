'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, Clock } from 'lucide-react';
import { api } from '@/lib/api';

export function NotificationBell({ guildId }) {
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    api.getReminders(guildId)
      .then((d) => setReminders(d.reminders || []))
      .catch(() => setReminders([]))
      .finally(() => setLoading(false));
  }, [guildId]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const activeReminders = reminders.filter((r) => {
    if (!r.remind_at) return true;
    return new Date(r.remind_at) > new Date();
  });

  const count = activeReminders.length;

  async function handleDelete(id) {
    try {
      await api.deleteReminder(guildId, id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    if (diff < 0) return 'Scaduto';
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `Tra ${days}g ${hours % 24}h`;
    if (hours > 0) return `Tra ${hours}h`;
    const mins = Math.floor(diff / 60000);
    return `Tra ${mins}min`;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-dark-800 transition-colors"
        title="Notifiche"
      >
        <Bell size={18} className="text-dark-300" />
        {count > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-bloods-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-dark-700 bg-dark-900 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-dark-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Promemoria attivi</span>
            <span className="text-xs text-dark-400">{count} {count === 1 ? 'nuovo' : 'nuovi'}</span>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="spinner mx-auto" />
            </div>
          ) : activeReminders.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell size={28} className="mx-auto mb-2 text-dark-600" />
              <p className="text-sm text-dark-400">Nessun promemoria attivo</p>
            </div>
          ) : (
            <div className="py-1">
              {activeReminders.map((r) => (
                <div
                  key={r.id}
                  className="px-4 py-3 hover:bg-dark-800 transition-colors border-b border-dark-800/50 last:border-0"
                >
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-gold-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.content || r.message || 'Promemoria'}</p>
                      {r.remind_at && (
                        <p className="text-xs text-dark-400 mt-0.5">{formatTime(r.remind_at)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-dark-500 hover:text-bloods-400 transition-colors shrink-0"
                      title="Elimina"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t border-dark-800">
            <a
              href="/dashboard/reminders"
              className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
            >
              Vedi tutti i promemoria →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
