// src/modules/games/valorant.js
// Valorant — fetches latest patch notes and news from Riot's official feeds.
const axios = require('axios');

async function fetchMeta() {
  const items = [];
  const now = new Date().toISOString();

  // 1. Patch notes page (always relevant)
  items.push({
    kind: 'patch',
    title: 'Valorant — Patch Notes',
    body: '**Ultime patch notes di Valorant**\n\nConsulta le note complete della patch più recente sul sito ufficiale Riot Games.',
    url: 'https://playvalorant.com/it-it/news/patch-notes/',
  });

  // 2. Try to fetch recent news from Riot's API
  try {
    const { data } = await axios.get('https://playvalorant.com/it-it/news/', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      // Extract article titles from HTML
      const matches = [...data.matchAll(/<a[^>]*href="([^"]*news[^"]*)"[^>]*>([^<]{10,100})<\/a>/gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://playvalorant.com${m[1]}`;
        const title = m[2].trim();
        if (title && !title.includes('<')) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da Valorant: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Esports / VCT news
  items.push({
    kind: 'news',
    title: 'Valorant Champions Tour (VCT)',
    body: '**Valorant Champions Tour** — Scopri i risultati e il calendario del circuito competitivo ufficiale.',
    url: 'https://vct.iaesports.com/',
  });

  return items;
}

module.exports = { fetchMeta };
