// src/services/tiktokService.js
// TikTok integration — auto-posts new TikToks from the guild account.
// Uses TikTok Display API (OAuth2) or public scraping fallback.
// Requires TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env for API mode.
// Falls back to public profile scraping if no API credentials.
const axios = require('axios');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const CHECK_INTERVAL = '*/15 * * * *';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

let _task = null;
let _lastVideoId = null;
let _accessToken = null;
let _tokenExpires = 0;

function getClientKey() {
  return process.env.TIKTOK_CLIENT_KEY || null;
}

function getClientSecret() {
  return process.env.TIKTOK_CLIENT_SECRET || null;
}

function getUsername() {
  return process.env.TIKTOK_USERNAME || null;
}

function isEnabled() {
  return Boolean(getUsername());
}

function isApiMode() {
  return Boolean(getClientKey() && getClientSecret());
}

/**
 * Get OAuth2 access token (client_credentials flow).
 * TikTok requires user-specific OAuth for most endpoints, so this is limited.
 * For now we use the research/video API if available.
 */
async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExpires - 60000) return _accessToken;
  if (!isApiMode()) return null;
  try {
    const res = await axios.post(`${TIKTOK_API_BASE}/oauth/token/`, {
      client_key: getClientKey(),
      client_secret: getClientSecret(),
      grant_type: 'client_credentials',
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });
    _accessToken = res.data?.access_token;
    _tokenExpires = Date.now() + (res.data?.expires_in ?? 7200) * 1000;
    return _accessToken;
  } catch (err) {
    logger.warn(`TikTok getAccessToken failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch latest video via public profile page (scrape fallback).
 * TikTok embeds JSON data in the page HTML.
 * @returns {Promise<object|null>} { videoId, description, thumbnail, createTime, webLink }
 */
async function fetchLatestVideoScrape() {
  const username = getUsername();
  if (!username) return null;
  try {
    const url = `https://www.tiktok.com/@${username}`;
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    });
    if (!res.data || typeof res.data !== 'string') return null;

    // TikTok embeds SIGI_STATE or __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON
    const sigiMatch = res.data.match(/"webapp\.video-detail":(\{[^}]+\})/);
    const universalMatch = res.data.match(/__UNIVERSAL_DATA_FOR_REHYDRATION__[^>]*>([\s\S]*?)<\/script>/);

    let videoData = null;
    if (universalMatch) {
      try {
        const json = JSON.parse(universalMatch[1]);
        const itemList = json?.__DEFAULT_SCOPE__?.['webapp\.video-detail']?.itemList;
        videoData = itemList?.[0];
      } catch {}
    }
    if (!videoData && sigiMatch) {
      try {
        const json = JSON.parse(sigiMatch[1]);
        videoData = json?.itemList?.[0];
      } catch {}
    }

    if (!videoData) return null;

    const videoId = videoData.id || videoData.video?.id;
    const desc = (videoData.desc || '').slice(0, 300);
    const thumbnail = videoData.video?.cover || videoData.video?.originCover;
    const createTime = videoData.createTime;
    const stats = videoData.stats || {};

    return {
      videoId: String(videoId),
      description: desc,
      thumbnail,
      createTime: createTime ? new Date(createTime * 1000).toISOString() : null,
      webLink: `https://www.tiktok.com/@${username}/video/${videoId}`,
      playCount: stats.playCount || 0,
      likeCount: stats.diggCount || 0,
      commentCount: stats.commentCount || 0,
      shareCount: stats.shareCount || 0,
    };
  } catch (err) {
    logger.warn(`TikTok fetchLatestVideoScrape failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch latest video using TikTok Display API.
 * Note: TikTok API requires user OAuth, so this may not work for server-side.
 */
async function fetchLatestVideoApi() {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    // TikTok Display API — query user videos
    const res = await axios.get(`${TIKTOK_API_BASE}/video/list/`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { max_count: 1 },
      timeout: 10000,
    });
    const video = res.data?.data?.videos?.[0];
    if (!video) return null;
    return {
      videoId: video.id,
      description: (video.title || video.description || '').slice(0, 300),
      thumbnail: video.cover_image_url,
      createTime: video.create_time ? new Date(video.create_time).toISOString() : null,
      webLink: video.share_url || `https://www.tiktok.com/@${getUsername()}/video/${video.id}`,
      playCount: video.view_count || 0,
      likeCount: video.like_count || 0,
      commentCount: video.comment_count || 0,
      shareCount: video.share_count || 0,
    };
  } catch (err) {
    logger.warn(`TikTok fetchLatestVideoApi failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch the latest video from the configured TikTok account.
 */
async function fetchLatestVideo() {
  if (!isEnabled()) return null;
  // Try API first, fall back to scraping
  if (isApiMode()) {
    const apiResult = await fetchLatestVideoApi();
    if (apiResult) return apiResult;
  }
  return fetchLatestVideoScrape();
}

/**
 * Check for new TikToks and post to Discord.
 */
async function checkNewVideo(client) {
  if (!isEnabled()) return;
  const video = await fetchLatestVideo();
  if (!video || !video.videoId) return;

  if (_lastVideoId === video.videoId) return;
  if (_lastVideoId === null) {
    _lastVideoId = video.videoId;
    logger.info('TikTokService: initialized with latest video, no announcement.');
    return;
  }

  _lastVideoId = video.videoId;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  await guild.channels.fetch();
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && (c.name.includes('tiktok') || c.name.includes('content') || c.name.includes('social'))
  );
  if (!channel) {
    logger.warn('TikTokService: no #tiktok or #content channel found.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Nuovo TikTok!')
    .setColor(0x010101)
    .setDescription(
      (video.description ? `${video.description}\n\n` : '') +
      `:cinema: **Video:** [Guarda su TikTok](${video.webLink})\n` +
      (video.createTime ? `:calendar: **Pubblicato:** ${new Date(video.createTime).toLocaleString('it-IT')}\n` : '') +
      (video.playCount ? `:eye: **Views:** ${video.playCount.toLocaleString('it-IT')}\n` : '') +
      (video.likeCount ? `:heart: **Like:** ${video.likeCount.toLocaleString('it-IT')}\n` : '') +
      (video.commentCount ? `:speech_balloon: **Commenti:** ${video.commentCount.toLocaleString('it-IT')}\n` : '') +
      (video.shareCount ? `:arrow_forward: **Share:** ${video.shareCount.toLocaleString('it-IT')}` : '')
    )
    .setURL(video.webLink)
    .setFooter({ text: 'Bloods Hub • TikTok Auto-Post' })
    .setTimestamp();

  if (video.thumbnail) embed.setImage(video.thumbnail);

  await channel.send({
    content: '@everyone Nuovo TikTok pubblicato!',
    embeds: [embed],
  }).catch(() => {});

  logger.info(`TikTokService: announced new video "${video.description?.slice(0, 50)}"`);
}

function start(client) {
  if (!isEnabled()) {
    logger.info('TikTokService: TIKTOK_USERNAME not set, skipping.');
    return;
  }
  _task = cron.schedule(CHECK_INTERVAL, () => checkNewVideo(client).catch(() => {}));
  logger.info(`TikTokService: started (checking every 15min, mode: ${isApiMode() ? 'API' : 'scrape'}).`);
  setTimeout(() => checkNewVideo(client).catch(() => {}), 45000);
}

function stop() {
  if (_task) _task.stop();
  _task = null;
  logger.info('TikTokService: stopped.');
}

module.exports = { start, stop, fetchLatestVideo, isEnabled, isApiMode };
