// src/services/socialGrowthService.js
// Social Growth Tracker — monitors YouTube/TikTok stats daily,
// tracks growth trends, suggests content ideas based on trending WoW topics,
// and posts weekly growth reports to Discord.
const axios = require('axios');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');
const youtubeService = require('./youtubeService');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const API_BASE = 'https://www.googleapis.com/youtube/v3';

let _task = null;
let _statsHistory = [];
let _lastTrendingCheck = null;
let _trendingCache = [];

/**
 * Search YouTube for trending WoW content to use as content inspiration.
 */
async function fetchTrendingWoWTopics() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const queries = [
    'World of Warcraft Midnight raid italiano',
    'WoW mythic plus gameplay italiano',
    'WoW gilda italiana raid progress',
    'World of Warcraft PvP arena BG',
    'WoW guide tips tricks 2026',
  ];

  const results = [];
  for (const q of queries) {
    try {
      const res = await axios.get(`${API_BASE}/search`, {
        params: {
          part: 'snippet,statistics',
          q,
          type: 'video',
          order: 'viewCount',
          maxResults: 3,
          publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          key: apiKey,
        },
        timeout: 10000,
      });
      for (const item of res.data.items || []) {
        results.push({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          videoId: item.id.videoId,
          publishedAt: item.snippet.publishedAt,
          query: q,
        });
      }
    } catch (err) {
      // Continue on individual query errors
    }
  }

  // Deduplicate by videoId
  const seen = new Set();
  _trendingCache = results.filter(r => {
    if (seen.has(r.videoId)) return false;
    seen.add(r.videoId);
    return true;
  });
  _lastTrendingCheck = Date.now();
  return _trendingCache;
}

/**
 * Track daily stats and calculate growth delta.
 */
async function trackDailyStats() {
  const stats = await youtubeService.fetchChannelStats();
  if (!stats) return null;

  const entry = {
    date: new Date().toISOString().split('T')[0],
    subscriberCount: stats.subscriberCount,
    viewCount: stats.viewCount,
    videoCount: stats.videoCount,
    timestamp: Date.now(),
  };

  _statsHistory.push(entry);
  // Keep last 90 days
  if (_statsHistory.length > 90) _statsHistory.shift();

  return entry;
}

/**
 * Calculate growth between oldest and latest entry.
 */
function getGrowthSummary() {
  if (_statsHistory.length < 2) return null;
  const latest = _statsHistory[_statsHistory.length - 1];
  const oldest = _statsHistory[0];
  return {
    days: Math.round((latest.timestamp - oldest.timestamp) / (1000 * 60 * 60 * 24)),
    subGrowth: latest.subscriberCount - oldest.subscriberCount,
    viewGrowth: latest.viewCount - oldest.viewCount,
    videoGrowth: latest.videoCount - oldest.videoCount,
    currentSubs: latest.subscriberCount,
    currentViews: latest.viewCount,
    currentVideos: latest.videoCount,
  };
}

/**
 * Post weekly growth report to Discord.
 */
async function postWeeklyGrowthReport(client) {
  const stats = await youtubeService.fetchChannelStats();
  if (!stats) return;

  const trending = _trendingCache.length > 0 ? _trendingCache : await fetchTrendingWoWTopics();

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  await guild.channels.fetch();
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && c.name.includes('youtube')
  );
  if (!channel) return;

  const growth = getGrowthSummary();

  const embed = new EmbedBuilder()
    .setTitle('📊 Report Crescita Social — Settimanale')
    .setColor(0xff0000)
    .setDescription(
      `**YouTube — ${stats.title}**\n\n` +
      `👥 Iscritti: **${stats.subscriberCount.toLocaleString('it-IT')}**${growth ? ` (${growth.subGrowth >= 0 ? '+' : ''}${growth.subGrowth} questo periodo)` : ''}\n` +
      `👁️ Views totali: **${stats.viewCount.toLocaleString('it-IT')}**${growth ? ` (${growth.viewGrowth >= 0 ? '+' : ''}${growth.viewGrowth})` : ''}\n` +
      `🎬 Video pubblicati: **${stats.videoCount}**\n\n` +
      `**🔥 Contenuti WoW trending questa settimana:**\n` +
      (trending.length > 0
        ? trending.slice(0, 5).map((t, i) =>
            `${i + 1}. [${t.title.substring(0, 60)}](https://youtube.com/watch?v=${t.videoId}) — ${t.channel}`
          ).join('\n')
        : 'Nessun dato trending disponibile.')
    )
    .addFields({
      name: '💡 Suggerimenti contenuti Bloods',
      value: [
        '• **Raid recap (Mer+Gio)**: Fabio/Costanza registrano, highlight kill e wipe divertenti',
        '• **M+ key run**: clip delle key piu tese, timer che scade, clutch heal/tank',
        '• **"Se sei nabbo ti insegniamo"**: mini-guide 30s su addon, meccaniche, rotation',
        '• **YouTube Shorts/TikTok**: clip verticali 30-60s, cross-post su entrambe le piattaforme',
        '• **Community vibe**: momenti Discord, voice chat divertenti, meme gilda',
        '• **DayZ/Metin2/LoL**: contenuti cross-game con brand Bloods unificato',
      ].join('\n'),
    })
    .setFooter({ text: 'Bloods Hub • Social Growth Report' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch((err) => logger.warn(`SocialGrowthService: failed to post weekly report: ${err.message}`));
}

/**
 * Post content ideas to Discord (daily).
 */
async function postContentIdeas(client) {
  const trending = await fetchTrendingWoWTopics();
  if (trending.length === 0) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  await guild.channels.fetch();
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && (c.name.includes('youtube') || c.name.includes('content'))
  );
  if (!channel) return;

  // Pick 3 random trending topics
  const shuffled = trending.sort(() => Math.random() - 0.5).slice(0, 3);

  const embed = new EmbedBuilder()
    .setTitle('💡 Idee Contenuti di Oggi')
    .setColor(0x00ff88)
    .setDescription(
      'Contenuti WoW trending su YouTube che i Bloods possono ricreare con la loro voce:\n\n' +
      shuffled.map((t, i) =>
        `${i + 1}. **${t.title.substring(0, 70)}**\n` +
        `   Canale: ${t.channel}\n` +
        `   [Guarda e prendi spunto](https://youtube.com/watch?v=${t.videoId})`
      ).join('\n\n')
    )
    .addFields({
      name: '🎯 Azione consigliata',
      value: 'Scegli un topic, crea una versione Bloods (famiglia + progress) e pubblicala entro 48h. Cross-posta su TikTok e YouTube Shorts. Se raidi con criterio, mostra il criterio.',
    })
    .setFooter({ text: 'Bloods Hub • Content Ideas' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch((err) => logger.warn(`SocialGrowthService: failed to post content ideas: ${err.message}`));
  logger.info('SocialGrowthService: posted daily content ideas.');
}

/**
 * Optimize existing video metadata via YouTube API.
 * Note: This requires OAuth2 for updating video details.
 * For now, we generate recommendations to apply manually.
 */
async function generateOptimizationReport(client) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return;

  try {
    const chRes = await axios.get(`${API_BASE}/channels`, {
      params: { part: 'contentDetails,snippet,brandingSettings', id: channelId, key: apiKey },
      timeout: 10000,
    });
    const ch = chRes.data?.items?.[0];
    if (!ch) return;

    const uploadsId = ch.contentDetails.relatedPlaylists.uploads;
    const plRes = await axios.get(`${API_BASE}/playlistItems`, {
      params: { part: 'snippet', playlistId: uploadsId, maxResults: 50, key: apiKey },
      timeout: 10000,
    });

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    await guild.channels.fetch();
    const channel = [...guild.channels.cache.values()].find(
      (c) => c.name && c.name.includes('youtube')
    );
    if (!channel) return;

    const issues = [];
    for (const item of plRes.data.items || []) {
      const v = item.snippet;
      const vid = v.resourceId?.videoId;
      const desc = v.description || '';
      const title = v.title || '';

      if (desc.length < 50) {
        issues.push(`📹 **${title}** — descrizione troppo breve (${desc.length} caratteri). Aggiungi: link Discord, link sito, timestamp, tag SEO. https://youtube.com/watch?v=${vid}`);
      }
      if (title.length < 20 || !title.match(/[A-Z]/)) {
        issues.push(`📹 **${title}** — titolo non ottimizzato. Usa keyword + emozione (es. "PRIMO KILL MITICO — Bloods Guild")`);
      }
    }

    const channelIssues = [];
    if (!ch.brandingSettings?.channel?.keywords) {
      channelIssues.push('❌ Nessun keyword nel canale. Aggiungi: WoW, World of Warcraft, gilda italiana, raid, M+, PvP, Pozzo dell\'Eternità');
    }
    if (ch.snippet?.description?.length < 100) {
      channelIssues.push('❌ Descrizione canale breve. Aggiungi: link Discord, sito, orari raid, info gilda');
    }

    if (issues.length === 0 && channelIssues.length === 0) {
      const ok = new EmbedBuilder()
        .setTitle('✅ SEO Audit — Tutto ottimizzato!')
        .setColor(0x00ff00)
        .setDescription('Tutti i video e il canale sono ottimizzati. Continua così!')
        .setTimestamp();
      await channel.send({ embeds: [ok] }).catch((err) => logger.warn(`SocialGrowthService: failed to post SEO ok: ${err.message}`));
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔧 SEO Audit — Ottimizzazioni necessarie')
      .setColor(0xffa500)
      .setDescription(
        (channelIssues.length > 0 ? '**Problemi canale:**\n' + channelIssues.join('\n') + '\n\n' : '') +
        (issues.length > 0 ? `**Problemi video (${issues.length}):**\n` + issues.join('\n\n') : '')
      )
      .addFields({
        name: '📝 Tag SEO consigliati per ogni video',
        value: '`WoW, World of Warcraft, Midnight, Midnight Season 2, Ulatek, gilda italiana, Pozzo dell\'Eternità, raid, mythic plus, M+, PvP, Orda, EU, Bloods, Bloods Community, WoW Italia, WoW Italian, MMORPG, soft progress, family guild, DayZ, Metin2, LoL, multigioco`',
      })
      .addFields({
        name: '🔗 Link da includere in ogni descrizione',
        value: '`Discord: https://discord.gg/DrGMeEMxF6 | Sito: https://bloodswow.it`',
      })
      .setFooter({ text: 'Bloods Hub • SEO Audit' })
      .setTimestamp();

    await channel.send({ content: '<@&1529875116039606274>', embeds: [embed] }).catch((err) => logger.warn(`SocialGrowthService: failed to post SEO audit: ${err.message}`));
    logger.info('SocialGrowthService: posted SEO optimization report.');
  } catch (err) {
    logger.error(`SocialGrowthService SEO audit failed: ${err.message}`);
  }
}

function start(client) {
  // Daily stats tracking at 00:01
  _task = cron.schedule('1 0 * * *', () => trackDailyStats().catch((err) => logger.warn(`SocialGrowthService: daily stats error: ${err.message}`)));

  // Weekly growth report on Sundays at 18:00
  cron.schedule('0 18 * * 0', () => postWeeklyGrowthReport(client).catch((err) => logger.warn(`SocialGrowthService: weekly report error: ${err.message}`)));

  // Content ideas every 2 days at 12:00
  cron.schedule('0 12 */2 * *', () => postContentIdeas(client).catch((err) => logger.warn(`SocialGrowthService: content ideas error: ${err.message}`)));

  // SEO audit weekly on Mondays at 10:00
  cron.schedule('0 10 * * 1', () => generateOptimizationReport(client).catch((err) => logger.warn(`SocialGrowthService: SEO audit error: ${err.message}`)));

  // Initial tracking
  setTimeout(() => {
    trackDailyStats().catch((err) => logger.warn(`SocialGrowthService: initial stats error: ${err.message}`));
    fetchTrendingWoWTopics().catch((err) => logger.warn(`SocialGrowthService: initial trending error: ${err.message}`));
  }, 20000);

  logger.info('SocialGrowthService: started (daily tracking, weekly reports, bi-daily content ideas, weekly SEO audit).');
}

function stop() {
  if (_task) _task.stop();
  _task = null;
  logger.info('SocialGrowthService: stopped.');
}

module.exports = {
  start,
  stop,
  trackDailyStats,
  fetchTrendingWoWTopics,
  getGrowthSummary,
  postWeeklyGrowthReport,
  postContentIdeas,
  generateOptimizationReport,
};
