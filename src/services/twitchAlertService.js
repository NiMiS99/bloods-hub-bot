// src/services/twitchAlertService.js
// Monitors guild members' Twitch streams and posts announcements when they go live.
// Uses Discord presence (streaming type) — no Twitch API key required.
// Checks every 2 minutes for members with "Streaming" presence.
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const CHECK_INTERVAL_MS = 120_000;
const STREAMING_ACTIVITY_TYPE = 'STREAMING';

// Channel ID for live announcements (Streaming Zone category)
const LIVE_CHANNEL_ID = '1459562164091097109';

let _interval = null;
const _notifiedStreamers = new Map(); // userId -> { streamTitle, since }

async function checkStreams(client) {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = guild.channels.cache.get(LIVE_CHANNEL_ID);
    if (!channel) return;

    const now = Date.now();
    const liveNow = new Set();

    for (const [memberId, presence] of guild.presences.cache) {
      const streamingActivity = presence.activities.find(
        (a) => a.type === STREAMING_ACTIVITY_TYPE
      );
      if (!streamingActivity) continue;

      liveNow.add(memberId);
      const streamKey = streamingActivity.url || streamingActivity.details || 'unknown';
      const prev = _notifiedStreamers.get(memberId);

      // Only notify if: not notified before, or stream title changed
      if (!prev || prev.streamKey !== streamKey) {
        const member = await guild.members.fetch(memberId).catch(() => null);
        if (!member || member.user.bot) continue;

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setTitle(`${member.displayName} è ora in live!`)
          .setColor(0x9146ff)
          .setDescription(
            `**${streamingActivity.details || 'Streaming'}**\n` +
            `Game: ${streamingActivity.state || 'Sconosciuto'}\n\n` +
            (streamingActivity.url ? `[Guarda lo stream](${streamingActivity.url})` : '')
          )
          .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
          .setFooter({ text: 'Bloods Community • Twitch Alerts' })
          .setTimestamp();

        await channel.send({ content: `<@${memberId}>`, embeds: [embed] }).catch(() => {});
        _notifiedStreamers.set(memberId, { streamKey, since: now });
        logger.info(`TwitchAlert: ${member.user.tag} went live: ${streamingActivity.details}`);
      }
    }

    // Clear notifications for members who stopped streaming
    for (const [memberId] of _notifiedStreamers) {
      if (!liveNow.has(memberId)) {
        _notifiedStreamers.delete(memberId);
      }
    }
  } catch (err) {
    logger.warn(`TwitchAlert: check error: ${err.message}`);
  }
}

function start(client) {
  _interval = setInterval(() => checkStreams(client).catch(() => {}), CHECK_INTERVAL_MS);
  logger.info('TwitchAlertService: started (checking every 2min).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  _notifiedStreamers.clear();
  logger.info('TwitchAlertService: stopped.');
}

module.exports = { start, stop };
