// src/services/badgeService.js
// Badge/achievement system. Checks conditions and awards badges.
const { User, UserBadge, UserGame, CommunityEvent, LfgSession } = require('../db');
const logger = require('../utils/logger');

// Badge definitions with check functions.
const BADGES = {
  founder: {
    code: 'founder',
    name: 'Fondatore',
    icon: '👑',
    description: 'Primo membro del server',
    check: async (user, _guild) => {
      const firstUser = await User.findOne({
        where: { guild_id: user.guild_id },
        order: [['joined_discord_at', 'ASC']],
      });
      return firstUser && firstUser.user_id === user.user_id;
    },
  },
  veteran: {
    code: 'veteran',
    name: 'Veterano',
    icon: '🏅',
    description: '6+ mesi nel server',
    check: async (user) => {
      if (!user.joined_discord_at) return false;
      const months = (Date.now() - new Date(user.joined_discord_at).getTime()) / (30 * 86400 * 1000);
      return months >= 6;
    },
  },
  polyglot: {
    code: 'polyglot',
    name: 'Poliglota',
    icon: '🎮',
    description: '5+ giochi selezionati',
    check: async (user) => {
      const count = await UserGame.count({ where: { user_id: user.user_id, guild_id: user.guild_id } });
      return count >= 5;
    },
  },
  chatty: {
    code: 'chatty',
    name: 'Chiacchierone',
    icon: '💬',
    description: '1000+ messaggi',
    check: async (user) => (user.total_messages || 0) >= 1000,
  },
  voice_king: {
    code: 'voice_king',
    name: 'Re del Vocale',
    icon: '🎙️',
    description: '100h+ in vocale',
    check: async (user) => (user.total_voice_seconds || 0) >= 360000,
  },
  social: {
    code: 'social',
    name: 'Social',
    icon: '🤝',
    description: '50+ membri della community',
    check: async (user, guild) => {
      if (!guild) return false;
      return guild.memberCount >= 50;
    },
  },
  level_10: {
    code: 'level_10',
    name: 'Livello 10',
    icon: '⭐',
    description: 'Raggiunto il livello 10',
    check: async (user) => (user.level || 0) >= 10,
  },
  level_25: {
    code: 'level_25',
    name: 'Livello 25',
    icon: '🌟',
    description: 'Raggiunto il livello 25',
    check: async (user) => (user.level || 0) >= 25,
  },
  event_organizer: {
    code: 'event_organizer',
    name: 'Organizzatore di Eventi',
    icon: '📅',
    description: 'Creato 3+ eventi community',
    check: async (user) => {
      const count = await CommunityEvent.count({ where: { created_by: user.user_id, guild_id: user.guild_id } });
      return count >= 3;
    },
  },
  helpful: {
    code: 'helpful',
    name: 'Utile',
    icon: '🤲',
    description: '500+ messaggi in canali di assistenza',
    check: async (user, guild) => {
      if (!guild) return false;
      const { ActivityLog } = require('../db');
      const assistChannels = guild.channels.cache.filter((c) => {
        const n = c.name.toLowerCase();
        return n.includes('assist') || n.includes('aiuto') || n.includes('support') || n.includes('ticket');
      });
      if (assistChannels.size === 0) return false;
      const count = await ActivityLog.count({
        where: {
          user_id: user.user_id,
          guild_id: user.guild_id,
          event_type: 'message',
          channel_id: assistChannels.map((c) => c.id),
        },
      });
      return count >= 500;
    },
  },
  streak_7: {
    code: 'streak_7',
    name: 'Costante',
    icon: '🔥',
    description: '7 giorni consecutivi di attività',
    check: async (user) => {
      if (!user.last_seen_at) return false;
      const { ActivityLog, Op } = require('../db');
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const days = await ActivityLog.findAll({
        attributes: ['created_at'],
        where: {
          user_id: user.user_id,
          guild_id: user.guild_id,
          created_at: { [Op.gte]: sevenDaysAgo },
        },
        group: ['date(created_at)'],
        raw: true,
      });
      // Check 7 consecutive days
      const dates = new Set(days.map((d) => new Date(d.created_at).toDateString()));
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000).toDateString();
        if (!dates.has(d)) return false;
      }
      return true;
    },
  },
  first_lfg: {
    code: 'first_lfg',
    name: 'Primo Gruppo',
    icon: '🎯',
    description: 'Hai creato la tua prima sessione LFG',
    check: async (user) => {
      const count = await LfgSession.count({ where: { captain_id: user.user_id, guild_id: user.guild_id } });
      return count >= 1;
    },
  },
  raid_veteran: {
    code: 'raid_veteran',
    name: 'Veterano di Incursioni',
    icon: '⚔️',
    description: 'Partecipato a 5+ incursioni WoW',
    check: async (user) => {
      const { RaidAttendance } = require('../db');
      const count = await RaidAttendance.count({ where: { user_id: user.user_id, guild_id: user.guild_id } });
      return count >= 5;
    },
  },
};

/**
 * Check all badges for a user and award any newly earned ones.
 * @param {object} user - User row
 * @param {object} [guild] - Discord guild (for member-count badges)
 * @returns {Promise<string[]>} - Array of newly awarded badge codes
 */
async function checkBadges(user, guild) {
  const newlyAwarded = [];
  for (const badge of Object.values(BADGES)) {
    try {
      // Check if already has this badge.
      const existing = await UserBadge.findOne({
        where: { user_id: user.user_id, guild_id: user.guild_id, badge_code: badge.code },
      });
      if (existing) continue;

      const earned = await badge.check(user, guild);
      if (earned) {
        await UserBadge.create({
          user_id: user.user_id,
          guild_id: user.guild_id,
          badge_code: badge.code,
        });
        newlyAwarded.push(badge.code);
        logger.info(`Badge "${badge.code}" awarded to ${user.username}`);
      }
    } catch (err) {
      logger.warn(`Badge check failed for ${badge.code}: ${err.message}`);
    }
  }
  return newlyAwarded;
}

/**
 * Get all badges for a user.
 * @returns {Promise<Array>} - Array of badge objects with code, name, icon, description
 */
async function getUserBadges(userId, guildId) {
  const rows = await UserBadge.findAll({
    where: { user_id: userId, guild_id: guildId },
  });
  return rows.map((r) => {
    const def = BADGES[r.badge_code];
    return def
      ? { code: r.badge_code, name: def.name, icon: def.icon, description: def.description, awarded_at: r.awarded_at }
      : { code: r.badge_code, name: r.badge_code, icon: '❓', description: 'Badge sconosciuto', awarded_at: r.awarded_at };
  });
}

module.exports = { BADGES, checkBadges, getUserBadges };
