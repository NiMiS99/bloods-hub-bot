// src/modules/games/lol.js
// League of Legends — fetches patch notes and news from Riot's official feeds.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. Patch notes
  items.push({
    kind: 'patch',
    title: 'League of Legends — Patch Notes',
    body: '**Ultime patch notes di League of Legends**\n\nConsulta tutte le modifiche, i buffs/nerfs e le novità della patch corrente.',
    url: 'https://www.leagueoflegends.com/it-it/news/patch-notes/',
  });

  // 2. Try to scrape recent news
  try {
    const { data } = await axios.get('https://www.leagueoflegends.com/it-it/news/', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      const matches = [...data.matchAll(/href="([^"]*news[^"]*)"[^>]*>[^<]*<[^>]*>([^<]{10,120})</gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://www.leagueoflegends.com${m[1]}`;
        const title = m[2].trim().replace(/<[^>]*>/g, '');
        if (title && title.length > 5) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da LoL: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Esports — LEC / Worlds
  items.push({
    kind: 'news',
    title: 'LoL Esports — LEC & Worlds',
    body: '**LoL Esports** — Risultati, calendario e classifiche della LEC e dei Worlds.',
    url: 'https://lolesports.com/',
  });

  // 4. Server status
  items.push({
    kind: 'server_status',
    title: 'LoL Server Status',
    body: 'Controlla lo stato dei server di League of Legends in tempo reale.',
    url: 'https://status.riotgames.com/',
  });

  return items;
}

module.exports = { fetchMeta };
