// src/modules/games/csgo.js
// Counter-Strike 2 — fetches patch notes and news from Steam.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. CS2 patch notes from Steam blog
  items.push({
    kind: 'patch',
    title: 'Counter-Strike 2 — Patch Notes',
    body: '**Ultime patch notes di Counter-Strike 2**\n\nVisita il blog ufficiale Steam per i dettagli completi degli aggiornamenti.',
    url: 'https://blog.counter-strike.net/it/updates/',
  });

  // 2. Try to fetch Steam news API
  try {
    const { data } = await axios.get('https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/', {
      params: {
        appid: 730, // CS2 app ID
        count: 5,
        maxlength: 300,
        format: 'json',
      },
      timeout: 8000,
    });
    if (data?.appnews?.newsitems) {
      for (const item of data.appnews.newsitems.slice(0, 3)) {
        items.push({
          kind: 'news',
          title: item.title.substring(0, 200),
          body: (item.contents || '').substring(0, 500).replace(/\\n/g, '\n').replace(/\\r/g, ''),
          url: item.url || 'https://blog.counter-strike.net/',
        });
      }
    }
  } catch {
    // soft-fail — Steam API may be rate-limited
  }

  // 3. Esports — HLTV
  items.push({
    kind: 'news',
    title: 'CS2 Esports — HLTV.org',
    body: '**CS2 Esports** — Risultati, ranking e news dal mondo competitivo su HLTV.org.',
    url: 'https://www.hltv.org/',
  });

  return items;
}

module.exports = { fetchMeta };
