'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useGuild } from '@/lib/guildContext';
import { Tag as TagIcon } from 'lucide-react';

export default function TagsPage() {
  const { guild } = useGuild();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (guild) load(); }, [guild]);

  async function load() {
    const { tags } = await api.getTags(guild.id);
    setTags(tags);
    setLoading(false);
  }

  if (loading) return <div className="text-zinc-400">Caricamento...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TagIcon className="w-6 h-6" /> Tag
      </h1>
      {tags.length === 0 ? (
        <div className="text-zinc-500 text-center py-12">
          <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nessun tag creato. Usa <code className="text-zinc-400">/tag add</code> su Discord.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">/{tag.name}</h3>
                  <p className="text-zinc-400 text-sm mt-1">{tag.content?.substring(0, 100)}</p>
                </div>
                <span className="text-zinc-600 text-xs">{tag.uses || 0} usi</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
