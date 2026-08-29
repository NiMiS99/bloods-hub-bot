'use client';

import { useEffect, useState } from 'react';
import { Youtube, Eye, Users, Video, ExternalLink, Calendar } from 'lucide-react';
import SiteShell, { PageHeader } from '@/components/site/SiteShell';
import Reveal from '@/components/site/Reveal';
import { siteConfig, fetchPublic } from '@/lib/siteConfig';

export default function YouTubePage() {
  const [data, setData] = useState({ channel: null, videos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublic('/youtube?limit=6')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SiteShell>
      <PageHeader
        title="YouTube"
        subtitle="Video, raid recap e contenuti della community Bloods"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24 space-y-12">
        {data.channel && (
          <Reveal>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-center">
                <Users className="mx-auto mb-2 text-bloods-500" size={24} />
                <div className="text-2xl font-bold text-white">{data.channel.subscriberCount}</div>
                <div className="text-xs text-dark-400 uppercase tracking-wider">Iscritti</div>
              </div>
              <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-center">
                <Eye className="mx-auto mb-2 text-bloods-500" size={24} />
                <div className="text-2xl font-bold text-white">{data.channel.viewCount.toLocaleString('it-IT')}</div>
                <div className="text-xs text-dark-400 uppercase tracking-wider">Visualizzazioni</div>
              </div>
              <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-6 text-center">
                <Video className="mx-auto mb-2 text-bloods-500" size={24} />
                <div className="text-2xl font-bold text-white">{data.channel.videoCount}</div>
                <div className="text-xs text-dark-400 uppercase tracking-wider">Video</div>
              </div>
            </div>
          </Reveal>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Ultimi video</h2>
          <a
            href="https://www.youtube.com/@bloods"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-bloods-400 hover:text-bloods-300 transition-colors"
          >
            <Youtube size={18} /> Canale YouTube <ExternalLink size={14} />
          </a>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-dark-800 bg-dark-900/60 p-4 animate-pulse">
                <div className="aspect-video rounded-lg bg-dark-800 mb-4" />
                <div className="h-4 bg-dark-800 rounded mb-2" />
                <div className="h-3 bg-dark-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : data.videos.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.videos.map((v, i) => (
              <Reveal key={v.videoId} delay={i * 75}>
                <a
                  href={`https://youtube.com/watch?v=${v.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-dark-800 bg-dark-900/60 overflow-hidden hover:border-bloods-700/50 transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-video overflow-hidden">
                    {v.thumbnail && (
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1">
                      <Youtube size={16} className="text-bloods-500" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2 group-hover:text-bloods-300 transition-colors">
                      {v.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-dark-400">
                      <Calendar size={12} />
                      {new Date(v.publishedAt).toLocaleDateString('it-IT', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </div>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Youtube size={48} className="mx-auto mb-4 text-dark-600" />
            <p className="text-dark-400 mb-4">Nessun video disponibile al momento.</p>
            <a
              href="https://www.youtube.com/@bloods"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-bloods-800 to-bloods-600 px-6 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              <Youtube size={18} /> Visita il canale
            </a>
          </div>
        )}

        <div className="rounded-2xl border border-dark-800 bg-dark-900/60 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Vuoi unirti alla community?</h3>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            Entra su Discord, gioca con noi e diventa parte della famiglia Bloods.
          </p>
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-bloods-800 to-bloods-600 px-8 py-3.5 font-semibold text-white shadow-xl shadow-bloods-900/50 transition-transform hover:-translate-y-0.5"
          >
            Entra su Discord <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </SiteShell>
  );
}
