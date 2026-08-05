// src/services/automodService.js
// Auto-moderation: word filter, spam detection, link blocking, mention spam, caps.
const { AutomodRule, Guild } = require('../db');
const logger = require('../utils/logger');
const AdvancedLogger = require('./advancedLogger');

// In-memory spam tracking: userId -> [{ timestamp, content }]
const _spamTracker = new Map();

/**
 * Check if a message violates any automod rules.
 * @param {object} message - Discord message
 * @returns {Promise<{violated: boolean, rule: object|null, reason: string}>}
 */
async function checkMessage(message) {
  if (message.author.bot || !message.guild) return { violated: false, rule: null, reason: '' };

  const guildRow = await Guild.findOne({ where: { guild_id: message.guild.id } });
  if (!guildRow || !guildRow.automod_enabled) return { violated: false, rule: null, reason: '' };

  const rules = await AutomodRule.findAll({
    where: { guild_id: message.guild.id, is_enabled: true },
  });

  const member = message.member;
  if (!member) return { violated: false, rule: null, reason: '' };

  for (const rule of rules) {
    // Check exempt roles
    if (rule.exempt_roles && Array.isArray(rule.exempt_roles)) {
      const isExempt = rule.exempt_roles.some((rid) => member.roles.cache.has(rid));
      if (isExempt) continue;
    }

    const result = checkRule(rule, message);
    if (result.violated) {
      return { violated: true, rule, reason: result.reason };
    }
  }

  return { violated: false, rule: null, reason: '' };
}

/**
 * Check a single rule against a message.
 */
function checkRule(rule, message) {
  const content = message.content || '';
  const lower = content.toLowerCase();

  switch (rule.rule_type) {
    case 'word_filter': {
      if (!rule.words || !Array.isArray(rule.words)) return { violated: false };
      const found = rule.words.some((w) => {
        const word = w.toLowerCase().trim();
        if (!word) return false;
        // Check as whole word or substring
        return lower.includes(word);
      });
      if (found) return { violated: true, reason: 'Parola proibita rilevata' };
      break;
    }

    case 'spam': {
      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();
      const threshold = rule.threshold || 5;
      const windowMs = 5000; // 5 seconds

      let entries = _spamTracker.get(key) || [];
      entries = entries.filter((e) => now - e.timestamp < windowMs);
      entries.push({ timestamp: now, content: lower });
      _spamTracker.set(key, entries);

      if (entries.length > threshold) {
        _spamTracker.delete(key);
        return { violated: true, reason: `Spam rilevato (${entries.length} messaggi in 5s)` };
      }
      break;
    }

    case 'link': {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const discordInvite = /(discord\.gg|discord\.com\/invite)/gi;
      if (urlRegex.test(content) || discordInvite.test(content)) {
        return { violated: true, reason: 'Link non consentito' };
      }
      break;
    }

    case 'mention_spam': {
      const threshold = rule.threshold || 5;
      const mentions = content.match(/<@!?\d+>/g) || content.match(/<@&\d+>/g) || [];
      const hasEveryone = content.includes('@everyone') || content.includes('@here');
      if (mentions.length >= threshold || (hasEveryone && mentions.length >= 1)) {
        return { violated: true, reason: `Menzioni di massa (${mentions.length})` };
      }
      break;
    }

    case 'caps': {
      const threshold = rule.threshold || 70; // percentage
      const letters = content.replace(/[^a-zA-Z]/g, '');
      if (letters.length < 10) break; // too short to check
      const caps = content.replace(/[^A-Z]/g, '').length;
      const pct = (caps / letters.length) * 100;
      if (pct >= threshold) {
        return { violated: true, reason: `Eccesso di maiuscole (${Math.round(pct)}%)` };
      }
      break;
    }
  }

  return { violated: false };
}

/**
 * Execute the automod action on a message.
 * @param {object} message - Discord message
 * @param {object} rule - AutomodRule row
 * @param {string} reason - Violation reason
 */
async function executeAction(message, rule, reason) {
  try {
    switch (rule.action) {
      case 'delete':
        await message.delete().catch(() => {});
        break;

      case 'warn':
        await message.delete().catch(() => {});
        await message.channel.send({
          content: `⚠️ <@${message.author.id}>, ${reason}. Messaggio rimosso.`,
        }).then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
        break;

      case 'mute': {
        await message.delete().catch(() => {});
        // Use native Discord timeout instead of role-based mute
        const durationMs = (rule.mute_duration || 10) * 60 * 1000;
        if (message.member.moderatable) {
          await message.member.timeout(durationMs, `Automod: ${reason}`).catch(() => {});
        } else {
          // Fallback to role-based mute if bot can't timeout (hierarchy)
          const muteRole = message.guild.roles.cache.find((r) => r.name === 'Muted');
          if (muteRole) {
            await message.member.roles.add(muteRole).catch(() => {});
            if (rule.mute_duration) {
              setTimeout(async () => {
                try { await message.member.roles.remove(muteRole); } catch {}
              }, rule.mute_duration * 60 * 1000);
            }
          }
        }
        break;
      }

      case 'kick':
        await message.delete().catch(() => {});
        await message.member.kick(reason).catch(() => {});
        break;
    }

    // Log to #log-staff via advancedLogger (embed)
    await AdvancedLogger.onAutomodAction(message, rule, reason);

    logger.info(`Automod: ${rule.rule_type} -> ${rule.action} on ${message.author.username}: ${reason}`);
  } catch (err) {
    logger.error(`Automod action failed: ${err.message}`);
  }
}

/**
 * Clean up spam tracker entries older than the window.
 * Called periodically.
 */
function cleanupSpamTracker() {
  const now = Date.now();
  for (const [key, entries] of _spamTracker.entries()) {
    const filtered = entries.filter((e) => now - e.timestamp < 10000);
    if (filtered.length === 0) {
      _spamTracker.delete(key);
    } else {
      _spamTracker.set(key, filtered);
    }
  }
}

// Run cleanup every 30 seconds
const _cleanupInterval = setInterval(cleanupSpamTracker, 30000).unref();

function stop() { if (_cleanupInterval) clearInterval(_cleanupInterval); }

module.exports = { checkMessage, checkRule, executeAction, stop };
