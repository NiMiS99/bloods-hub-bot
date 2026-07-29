// src/services/milestoneService.js
// Announces when the guild reaches member count milestones.
// Milestones: every 50 members up to 500, then every 100.
const logger = require('../utils/logger');
const { Guild } = require('../db');

const MILESTONES = [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500,
  600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000, 10000,
];

let _interval = null;
let _lastCount = new Map(); // guildId -> last known count
let _client = null;

function getMilestone(count) {
  let last = 0;
  for (const m of MILESTONES) {
    if (count >= m) last = m;
    else break;
  }
  return last;
}

async function checkMilestones() {
  if (!_client) return;

  for (const guild of _client.guilds.cache.values()) {
    try {
      const count = guild.memberCount;
      const prev = _lastCount.get(guild.id) || count;
      const milestone = getMilestone(count);
      const prevMilestone = getMilestone(prev);

      // Check if we crossed a new milestone
      if (milestone > prevMilestone && milestone > 0) {
        // Find announcement channel
        const guildRow = await Guild.findByPk(guild.id);
        const channelId = guildRow?.announcements_channel_id || guildRow?.welcome_channel_id;
        if (channelId) {
          const channel = guild.channels.cache.get(channelId);
          if (channel) {
            await channel.send({
              content: `🎉 **MILESTONE RAGGIUNTA!** 🎉\n\nIl server ha raggiunto **${milestone} membri**!\nGrazie a tutti per far parte della community! 🩸`,
            }).catch(() => {});
            logger.info(`Milestone: ${guild.name} reached ${milestone} members!`);
          }
        }
      }

      _lastCount.set(guild.id, count);
    } catch (err) {
      logger.debug(`Milestone check failed for ${guild.id}: ${err.message}`);
    }
  }
}

function start(client) {
  _client = client;
  // Initialize last counts
  for (const guild of client.guilds.cache.values()) {
    _lastCount.set(guild.id, guild.memberCount);
  }
  // Check every 5 minutes
  _interval = setInterval(checkMilestones, 5 * 60 * 1000).unref();
  logger.info('MilestoneService: started (checks every 5 min).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  _client = null;
}

module.exports = { start, stop, checkMilestones, getMilestone };
