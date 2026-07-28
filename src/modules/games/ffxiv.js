// src/modules/games/ffxiv.js
// Final Fantasy XIV — fetches patch notes and news from Lodestone.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. FFXIV Lodestone news
  items.push({
    kind: 'patch',
    title: 'FFXIV — Patch Notes',
    body: '**Ultime patch notes di Final Fantasy XIV**\n\nConsulta le note complete sul Lodestone ufficiale.',
    url: 'https://eu.finalfantasyxiv.com/lodestone/news/category/1',
  });

  // 2. Try to fetch Lodestone news
  try {
    const { data } = await axios.get('https://eu.finalfantasyxiv.com/lodestone/news/', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      const matches = [...data.matchAll(/<a[^>]*href="([^"]*news[^"]*)"[^>]*>([^<]{10,120})<\/a>/gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://eu.finalfantasyxiv.com${m[1]}`;
        const title = m[2].trim();
        if (title && title.length > 5 && !title.includes('{')) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da FFXIV: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Maintenance / server status
  items.push({
    kind: 'server_status',
    title: 'FFXIV — Maintenance & Server Status',
    body: 'Controlla manutenzioni programmate e stato dei server di FFXIV.',
    url: 'https://eu.finalfantasyxiv.com/lodestone/news/category/2',
  });

  // 4. Events
  items.push({
    kind: 'event',
    title: 'FFXIV — Eventi in corso',
    body: '**Eventi stagionali e speciali**\n\nScopri gli eventi attivi in Eorzea.',
    url: 'https://eu.finalfantasyxiv.com/lodestone/special/event/',
  });

  return items;
}

module.exports = { fetchMeta };
