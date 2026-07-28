// src/services/levelRewardService.js
// Checks level thresholds and assigns reward roles automatically.
const { LevelReward, Guild } = require('../db');
const { recordAudit } = require('../utils/auditLog');
const logger = require('../utils/logger');

/**
 * Check and assign level rewards for a user who just leveled up.
 * @param {object} guild - Discord Guild
 * @param {object} user - User DB row (with level field)
 * @param {number} newLevel - The new level reached
 */
async function checkLevelRewards(guild, user, newLevel) {
  try {
    const rewards = await LevelReward.findAll({
      where: { guild_id: guild.id, level: newLevel },
    });

    if (rewards.length === 0) return;

    const member = await guild.members.fetch(user.user_id, { force: false }).catch(() => null);
    if (!member) return;

    const guildRow = await Guild.findOne({ where: { guild_id: guild.id } });

    for (const reward of rewards) {
      if (reward.role_id) {
        const role = guild.roles.cache.get(reward.role_id);
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch((e) => {
            logger.warn(`Level reward: failed to add role ${role.name}: ${e.message}`);
          });
        }
      }

      // Send reward message in configured channel
      if (guildRow?.level_reward_channel_id && reward.message) {
        const channel = guild.channels.cache.get(guildRow.level_reward_channel_id);
        if (channel) {
          await channel.send({
            content: reward.message
              .replace('{user}', `<@${member.id}>`)
              .replace('{level}', newLevel.toString()),
          }).catch(() => {});
        }
      }
    }

    // Record audit
    await recordAudit({
      guildId: guild.id,
      actorId: user.user_id,
      action: 'level.reward',
      targetType: 'level',
      targetId: newLevel.toString(),
      details: { rewards: rewards.map((r) => ({ level: r.level, role_id: r.role_id })) },
    }).catch(() => {});

    logger.info(`Level rewards assigned to ${member.user.username} for level ${newLevel}`);
  } catch (err) {
    logger.error(`Level reward check failed: ${err.message}`);
  }
}

module.exports = { checkLevelRewards };
