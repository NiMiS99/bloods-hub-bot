// src/modules/games/wow.js
// World of Warcraft — fetches news, patch notes and server status from Blizzard.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. WoW news
  items.push({
    kind: 'news',
    title: 'WoW — Ultime Notizie',
    body: '**World of Warcraft News**\n\nLe ultime notizie, aggiornamenti e annunci dal mondo di Azeroth.',
    url: 'https://worldofwarcraft.blizzard.com/it-it/news',
  });

  // 2. Try to fetch Blizzard news page
  try {
    const { data } = await axios.get('https://worldofwarcraft.blizzard.com/it-it/news', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      const matches = [...data.matchAll(/<a[^>]*href="([^"]*news[^"]*)"[^>]*>[^<]*<[^>]*>([^<]{10,120})</gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://worldofwarcraft.blizzard.com${m[1]}`;
        const title = m[2].trim().replace(/<[^>]*>/g, '');
        if (title && title.length > 5) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da WoW: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Patch notes
  items.push({
    kind: 'patch',
    title: 'WoW — Patch Notes',
    body: '**Note della patch più recente**\n\nClass balancing, new content, bug fixes e altro.',
    url: 'https://worldofwarcraft.blizzard.com/it-it/news/patch-notes',
  });

  // 4. Server status
  items.push({
    kind: 'server_status',
    title: 'WoW — Stato Realm',
    body: 'Controlla lo stato dei realm (EU/US) in tempo reale.',
    url: 'https://worldofwarcraft.blizzard.com/it-it/game/status',
  });

  // 5. Raider.IO — mythic+ rankings
  items.push({
    kind: 'meta',
    title: 'WoW — Mythic+ Rankings (Raider.IO)',
    body: '**Mythic+ Rankings**\n\nClassifiche, score e affissi della settimana su Raider.IO.',
    url: 'https://raider.io/',
  });

  // 6. Warcraft Logs — raid rankings
  items.push({
    kind: 'meta',
    title: 'WoW — Raid Rankings (Warcraft Logs)',
    body: '**Warcraft Logs**\n\nPerformance, ranking e parse dei raid più recenti.',
    url: 'https://www.warcraftlogs.com/',
  });

  return items;
}

module.exports = { fetchMeta };
