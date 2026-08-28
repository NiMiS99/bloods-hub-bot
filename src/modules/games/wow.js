// src/modules/games/wow.js
// World of Warcraft — fetches news, patch notes and server status from Blizzard,
// Wowhead (RSS) and Icy Veins (RSS).
const axios = require('axios');

const WOWHEAD_RSS_URL = 'https://www.wowhead.com/news&rss';
const ICYVEINS_RSS_URL = 'https://www.icy-veins.com/rss';

function stripHtml(text) {
  return text.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
}

function parseRssItems(xml, sourceName, maxItems = 5) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const title = stripHtml(titleMatch?.[1] || '');
    const link = stripHtml(linkMatch?.[1] || '');
    const desc = stripHtml(descMatch?.[1] || '').slice(0, 200);
    const pubDate = dateMatch?.[1]?.trim() || '';

    if (title && link) {
      items.push({
        kind: 'news',
        title: `[${sourceName}] ${title}`,
        body: desc ? `**${title}**\n${desc}${desc.length >= 200 ? '...' : ''}` : `**${title}**`,
        url: link,
        pubDate,
      });
    }
  }
  return items;
}

async function fetchRss(url, sourceName, maxItems = 5) {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      return parseRssItems(data, sourceName, maxItems);
    }
  } catch {
    // soft-fail
  }
  return [];
}

async function fetchMeta() {
  const items = [];

  // 1. WoW official news (Blizzard)
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

  // 3. Wowhead RSS feed
  const wowheadItems = await fetchRss(WOWHEAD_RSS_URL, 'Wowhead', 5);
  items.push(...wowheadItems);

  // 4. Icy Veins RSS feed
  const icyveinsItems = await fetchRss(ICYVEINS_RSS_URL, 'Icy Veins', 3);
  items.push(...icyveinsItems);

  // 5. Patch notes
  items.push({
    kind: 'patch',
    title: 'WoW — Patch Notes',
    body: '**Note della patch più recente**\n\nClass balancing, new content, bug fixes e altro.',
    url: 'https://worldofwarcraft.blizzard.com/it-it/news/patch-notes',
  });

  // 6. Server status
  items.push({
    kind: 'server_status',
    title: 'WoW — Stato Realm',
    body: 'Controlla lo stato dei realm (EU/US) in tempo reale.',
    url: 'https://worldofwarcraft.blizzard.com/it-it/game/status',
  });

  // 7. Raider.IO — mythic+ rankings
  items.push({
    kind: 'meta',
    title: 'WoW — Mythic+ Rankings (Raider.IO)',
    body: '**Mythic+ Rankings**\n\nClassifiche, score e affissi della settimana su Raider.IO.',
    url: 'https://raider.io/',
  });

  // 8. Warcraft Logs — raid rankings
  items.push({
    kind: 'meta',
    title: 'WoW — Raid Rankings (Warcraft Logs)',
    body: '**Warcraft Logs**\n\nPerformance, ranking e parse dei raid più recenti.',
    url: 'https://www.warcraftlogs.com/',
  });

  return items;
}

module.exports = { fetchMeta };
