// src/modules/games/apex.js
// Apex Legends — fetches patch notes and news from EA.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. Apex Legends news
  items.push({
    kind: 'patch',
    title: 'Apex Legends — Patch Notes',
    body: '**Ultime patch notes di Apex Legends**\n\nConsulta le note complete della patch più recente sul sito ufficiale EA.',
    url: 'https://www.ea.com/it-it/games/apex-legends/news',
  });

  // 2. Try to fetch EA news page
  try {
    const { data } = await axios.get('https://www.ea.com/it-it/games/apex-legends/news', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      const matches = [...data.matchAll(/<a[^>]*href="([^"]*apex-legends[^"]*)"[^>]*>([^<]{10,120})<\/a>/gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://www.ea.com${m[1]}`;
        const title = m[2].trim();
        if (title && title.length > 5 && !title.includes('{')) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da Apex Legends: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Server status
  items.push({
    kind: 'server_status',
    title: 'Apex Legends — Server Status',
    body: 'Controlla lo stato dei server di Apex Legends.',
    url: 'https://help.ea.com/it-it/apex-legends/apex-legends/',
  });

  // 4. Esports — ALGS
  items.push({
    kind: 'news',
    title: 'Apex Legends Global Series (ALGS)',
    body: '**ALGS** — Calendario, risultati e classifiche del circuito competitivo ufficiale.',
    url: 'https://www.ea.com/it-it/compete/apex-legends/',
  });

  return items;
}

module.exports = { fetchMeta };
