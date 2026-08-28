'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Users, ArrowRight } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import { siteConfig, fetchPublic, formatEventDate } from '@/lib/siteConfig';

export default function EventiPage() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    fetchPublic('/events')
      .then((d) => setEvents(d.events))
      .catch(() => setEvents([]));
  }, []);

  return (
    <SiteShell>
      <PageHeader
        title="Eventi della gilda"
        subtitle="Raid, tornei, game night e serate community. Partecipa direttamente dal nostro Discord."
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
        {events === null ? (
          <div className="flex justify-center py-16"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dark-800 bg-dark-900/60">
            <CalendarDays className="mx-auto mb-4 text-dark-500" size={40} />
            <p className="text-dark-300 font-medium">Nessun evento in programma</p>
            <p className="mt-2 text-sm text-dark-400">
              Gli eventi creati dalla dashboard del bot appariranno qui automaticamente.
            </p>
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-6 py-3 text-sm font-semibold text-white"
            >
              Entra su Discord <ArrowRight size={16} />
            </a>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((e) => (
              <article
                key={e.id}
                className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 transition-all hover:border-bloods-800"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold text-white">{e.name}</h2>
                  {e.game && (
                    <span className="badge bg-bloods-900/50 text-bloods-300 border border-bloods-800 shrink-0">
                      {e.game.name}
                    </span>
                  )}
                </div>
                {e.description && (
                  <p className="text-sm text-dark-300 leading-relaxed mb-4">{e.description}</p>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-dark-400">
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    <CalendarDays size={13} className="text-gold-400" /> {formatEventDate(e.scheduledAt)}
                  </span>
                  {e.durationMinutes && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-gold-400" /> {e.durationMinutes} min
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={13} className="text-gold-400" /> {e.participantCount} iscritti
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
