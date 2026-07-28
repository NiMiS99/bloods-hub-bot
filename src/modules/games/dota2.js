// src/modules/games/dota2.js
// Dota 2 — fetches patch notes and news from Steam.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. Dota 2 patch notes
  items.push({
    kind: 'patch',
    title: 'Dota 2 — Patch Notes',
    body: '**Ultime patch notes di Dota 2**\n\nConsulta tutte le modifiche agli eroi, item e gameplay sul sito ufficiale.',
    url: 'https://www.dota2.com/patches',
  });

  // 2. Try Steam news API
  try {
    const { data } = await axios.get('https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/', {
      params: {
        appid: 570, // Dota 2 app ID
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
          url: item.url || 'https://www.dota2.com/',
        });
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Esports — Liquipedia
  items.push({
    kind: 'news',
    title: 'Dota 2 Esports — Liquipedia',
    body: '**Dota 2 Esports** — Risultati, calendario e classifiche su Liquipedia.',
    url: 'https://liquipedia.net/dota2/',
  });

  return items;
}

module.exports = { fetchMeta };
