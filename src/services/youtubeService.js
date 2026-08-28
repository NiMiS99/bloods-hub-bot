// src/services/youtubeService.js
// YouTube Data API v3 integration — auto-posts new videos from the guild channel
// and tracks channel statistics (subscribers, views, video count).
// Requires YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID in .env.
const axios = require('axios');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHECK_INTERVAL = '*/15 * * * *'; // every 15 min

let _task = null;
let _lastVideoId = null;

function getApiKey() {
  return process.env.YOUTUBE_API_KEY || null;
}

function getChannelId() {
  return process.env.YOUTUBE_CHANNEL_ID || null;
}

function isEnabled() {
  return Boolean(getApiKey() && getChannelId());
}

/**
 * Fetch the latest uploaded video from the channel.
 * @returns {Promise<object|null>} { videoId, title, description, thumbnail, publishedAt }
 */
async function fetchLatestVideo() {
  if (!isEnabled()) return null;
  try {
    const channelId = getChannelId();
    // 1. Get uploads playlist ID
    const chRes = await axios.get(`${API_BASE}/channels`, {
      params: {
        part: 'contentDetails,statistics,snippet',
        id: channelId,
        key: getApiKey(),
      },
      timeout: 10000,
    });
    const channel = chRes.data?.items?.[0];
    if (!channel) return null;

    const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

    // 2. Get latest video from uploads playlist
    const plRes = await axios.get(`${API_BASE}/playlistItems`, {
      params: {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 1,
        key: getApiKey(),
      },
      timeout: 10000,
    });
    const latest = plRes.data?.items?.[0]?.snippet;
    if (!latest) return null;

    return {
      videoId: latest.resourceId?.videoId,
      title: latest.title,
      description: (latest.description || '').slice(0, 300),
      thumbnail: latest.thumbnails?.high?.url || latest.thumbnails?.default?.url,
      publishedAt: latest.publishedAt,
      channelTitle: latest.channelTitle || channel.snippet?.title,
    };
  } catch (err) {
    logger.error(`YouTube fetchLatestVideo failed: ${err.message}`);
    return null;
  }
}

/**
 * Fetch channel statistics.
 * @returns {Promise<object|null>} { subscriberCount, viewCount, videoCount, title }
 */
async function fetchChannelStats() {
  if (!isEnabled()) return null;
  try {
    const res = await axios.get(`${API_BASE}/channels`, {
      params: {
        part: 'statistics,snippet',
        id: getChannelId(),
        key: getApiKey(),
      },
      timeout: 10000,
    });
    const ch = res.data?.items?.[0];
    if (!ch) return null;
    return {
      title: ch.snippet?.title,
      subscriberCount: parseInt(ch.statistics?.subscriberCount || 0),
      viewCount: parseInt(ch.statistics?.viewCount || 0),
      videoCount: parseInt(ch.statistics?.videoCount || 0),
    };
  } catch (err) {
    logger.error(`YouTube fetchChannelStats failed: ${err.message}`);
    return null;
  }
}

/**
 * Check for new videos and post to Discord.
 */
async function checkNewVideo(client) {
  if (!isEnabled()) return;
  const video = await fetchLatestVideo();
  if (!video || !video.videoId) return;

  if (_lastVideoId === video.videoId) return;
  if (_lastVideoId === null) {
    _lastVideoId = video.videoId;
    logger.info('YouTubeService: initialized with latest video, no announcement.');
    return;
  }

  _lastVideoId = video.videoId;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  // Find a suitable channel for YouTube announcements
  await guild.channels.fetch();
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && (c.name.includes('youtube') || c.name.includes('video') || c.name.includes('content'))
  );
  if (!channel) {
    logger.warn('YouTubeService: no #youtube or #content channel found.');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Nuovo video: ${video.title}`)
    .setColor(0xff0000)
    .setDescription(
      video.description ? `${video.description}\n\n` : '' +
      `**Canale:** ${video.channelTitle}\n` +
      `**Pubblicato:** ${new Date(video.publishedAt).toLocaleString('it-IT')}`
    )
    .setURL(`https://www.youtube.com/watch?v=${video.videoId}`)
    .setThumbnail(video.thumbnail)
    .setImage(video.thumbnail)
    .setFooter({ text: 'Bloods Hub • YouTube Auto-Post' })
    .setTimestamp();

  await channel.send({
    content: '@everyone Nuovo video sul canale YouTube!',
    embeds: [embed],
  }).catch(() => {});

  logger.info(`YouTubeService: announced new video "${video.title}"`);
}

/**
 * Post channel stats to Discord (weekly summary).
 */
async function postWeeklyStats(client) {
  if (!isEnabled()) return;
  const stats = await fetchChannelStats();
  if (!stats) return;

  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  await guild.channels.fetch();
  const channel = [...guild.channels.cache.values()].find(
    (c) => c.name && (c.name.includes('youtube') || c.name.includes('content'))
  );
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('YouTube — Statistiche Settimanali')
    .setColor(0xff0000)
    .setDescription(
      `**Canale:** ${stats.title}\n\n` +
      `:family: Iscritti: **${stats.subscriberCount.toLocaleString('it-IT')}**\n` +
      `:eye: Visualizzazioni totali: **${stats.viewCount.toLocaleString('it-IT')}**\n` +
      `:film: Video pubblicati: **${stats.videoCount}**`
    )
    .setFooter({ text: 'Bloods Hub • YouTube Stats' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
  logger.info('YouTubeService: posted weekly stats.');
}

function start(client) {
  if (!isEnabled()) {
    logger.info('YouTubeService: YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID not set, skipping.');
    return;
  }
  _task = cron.schedule(CHECK_INTERVAL, () => checkNewVideo(client).catch(() => {}));
  logger.info('YouTubeService: started (checking every 15min).');
  // Initial check after 30s
  setTimeout(() => checkNewVideo(client).catch(() => {}), 30000);
}

function stop() {
  if (_task) _task.stop();
  _task = null;
  logger.info('YouTubeService: stopped.');
}

module.exports = { start, stop, fetchLatestVideo, fetchChannelStats, postWeeklyStats, isEnabled };
