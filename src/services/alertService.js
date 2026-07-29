// src/services/alertService.js
// Monitoring alerts: sends critical alerts to a Discord webhook or channel.
// Monitors: uncaught errors, high memory, bot crashes, DB connection failures.
const axios = require('axios');
const logger = require('../utils/logger');

const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same alerts
const MEMORY_THRESHOLD_MB = 400; // alert if RSS > 400MB
const CHECK_INTERVAL_MS = 60 * 1000; // check every 60s

let _webhookUrl = null;
let _alertChannelId = null;
let _client = null;
const _lastAlerts = new Map(); // key -> timestamp
let _interval = null;
let _errorCount = 0;
let _startTime = Date.now();

/**
 * Initialize the alert service.
 */
function init(client, opts = {}) {
  _client = client;
  _webhookUrl = process.env.ALERT_WEBHOOK_URL || opts.webhookUrl || null;
  _alertChannelId = process.env.ALERT_CHANNEL_ID || opts.channelId || null;
  _startTime = Date.now();

  // Hook into unhandled rejections
  process.on('unhandledRejection', (reason) => {
    _errorCount++;
    sendAlert('unhandled_rejection', {
      title: 'Unhandled Promise Rejection',
      color: 0xff0000,
      description: `\`\`\`${String(reason?.message || reason).slice(0, 1500)}\`\`\``,
      fields: [
        { name: 'Error Count', value: String(_errorCount), inline: true },
        { name: 'Uptime', value: formatUptime(), inline: true },
      ],
    });
  });

  process.on('uncaughtException', (err) => {
    _errorCount++;
    sendAlert('uncaught_exception', {
      title: 'Uncaught Exception',
      color: 0xff0000,
      description: `\`\`\`${err.stack?.slice(0, 1500) || err.message}\`\`\``,
      fields: [
        { name: 'Error Count', value: String(_errorCount), inline: true },
        { name: 'Uptime', value: formatUptime(), inline: true },
      ],
    });
  });

  // Start periodic health checks
  _interval = setInterval(checkHealth, CHECK_INTERVAL_MS);
  logger.info('AlertService: started (monitoring memory, errors, uptime).');
}

/**
 * Stop the alert service.
 */
function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
  logger.info('AlertService: stopped.');
}

/**
 * Check health metrics and alert if thresholds exceeded.
 */
async function checkHealth() {
  try {
    const mem = process.memoryUsage();
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024);

    // High memory alert
    if (rssMB > MEMORY_THRESHOLD_MB) {
      await sendAlert('high_memory', {
        title: 'High Memory Usage',
        color: 0xffa500,
        description: `RSS memory: **${rssMB}MB** (threshold: ${MEMORY_THRESHOLD_MB}MB)\nHeap: **${heapMB}MB**`,
        fields: [
          { name: 'Uptime', value: formatUptime(), inline: true },
          { name: 'Guilds', value: String(_client?.guilds?.cache?.size || 0), inline: true },
        ],
      });
    }

    // Check if bot is responsive (guild cache populated)
    if (_client && _client.guilds.cache.size === 0) {
      await sendAlert('no_guilds', {
        title: 'Bot Not Connected',
        color: 0xff0000,
        description: 'Bot has 0 guilds in cache. May be disconnected from Discord.',
      });
    }
  } catch (err) {
    logger.debug(`AlertService checkHealth: ${err.message}`);
  }
}

/**
 * Send an alert to Discord (webhook or channel).
 */
async function sendAlert(key, embedData) {
  // Cooldown check
  const now = Date.now();
  const lastSent = _lastAlerts.get(key);
  if (lastSent && now - lastSent < ALERT_COOLDOWN_MS) return;

  _lastAlerts.set(key, now);

  const embed = {
    title: `🚨 ${embedData.title}`,
    color: embedData.color || 0xff0000,
    description: embedData.description,
    timestamp: new Date().toISOString(),
    footer: { text: 'Bloods Hub Bot • Alert System' },
  };

  if (embedData.fields) embed.fields = embedData.fields;

  try {
    // Try webhook first
    if (_webhookUrl) {
      await axios.post(_webhookUrl, {
        embeds: [embed],
        username: 'Bloods Bot Alerts',
      });
      logger.warn(`Alert sent: ${embedData.title}`);
      return;
    }

    // Fall back to channel
    if (_client && _alertChannelId) {
      const channel = _client.channels.cache.get(_alertChannelId);
      if (channel) {
        await channel.send({ content: '@here', embeds: [embed] });
        logger.warn(`Alert sent to channel: ${embedData.title}`);
        return;
      }
    }

    // No webhook/channel configured — just log
    logger.warn(`Alert (no webhook configured): ${embedData.title} — ${embedData.description}`);
  } catch (err) {
    logger.error(`AlertService sendAlert failed: ${err.message}`);
  }
}

/**
 * Manually send a custom alert (for use by other services).
 */
async function customAlert(title, description, color = 0xffa500) {
  return sendAlert(`custom:${title}`, { title, description, color });
}

/**
 * Format uptime as human-readable string.
 */
function formatUptime() {
  const seconds = Math.floor((Date.now() - _startTime) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

/**
 * Get alert stats.
 */
function getStats() {
  return {
    errorCount: _errorCount,
    uptime: formatUptime(),
    alertsSent: _lastAlerts.size,
    webhookConfigured: !!_webhookUrl,
    channelConfigured: !!_alertChannelId,
  };
}

module.exports = { init, stop, sendAlert, customAlert, getStats, checkHealth };
