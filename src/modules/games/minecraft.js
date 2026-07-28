// src/modules/games/minecraft.js
// Minecraft — fetchs patch notes and news from Minecraft.net.
const axios = require('axios');

async function fetchMeta() {
  const items = [];

  // 1. Minecraft news
  items.push({
    kind: 'patch',
    title: 'Minecraft — Release Notes',
    body: '**Ultime versioni di Minecraft**\n\nConsulta le note complete delle versioni Java e Bedrock sul sito ufficiale.',
    url: 'https://www.minecraft.net/it-it/article',
  });

  // 2. Try to fetch Minecraft.net news
  try {
    const { data } = await axios.get('https://www.minecraft.net/it-it/article', {
      timeout: 8000,
      headers: { 'User-Agent': 'BloodsHubBot/1.0' },
    });
    if (data && typeof data === 'string') {
      const matches = [...data.matchAll(/href="([^"]*article[^"]*)"[^>]*>[^<]*<[^>]*>([^<]{10,120})</gi)];
      for (const m of matches.slice(0, 3)) {
        const url = m[1].startsWith('http') ? m[1] : `https://www.minecraft.net${m[1]}`;
        const title = m[2].trim().replace(/<[^>]*>/g, '');
        if (title && title.length > 5) {
          items.push({
            kind: 'news',
            title: title,
            body: `Nuova notizia da Minecraft: **${title}**`,
            url: url,
          });
        }
      }
    }
  } catch {
    // soft-fail
  }

  // 3. Server status — Mojang/Microsoft
  items.push({
    kind: 'server_status',
    title: 'Minecraft — Stato Servizi',
    body: 'Controlla lo stato dei servizi Minecraft (auth, realms, multiplayer).',
    url: 'https://help.minecraft.net/hc/en-us/articles/360032714932-Minecraft-services-status',
  });

  return items;
}

module.exports = { fetchMeta };
