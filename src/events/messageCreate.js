// src/events/messageCreate.js
// Tracks text activity (message count) for leaderboard/voice-text metrics.
// Also awards XP for messages, checks badges, runs automod, and handles custom commands.
const { User, ActivityLog, Guild, CustomCommand } = require('../db');
const { awardMessageXp } = require('../services/xpService');
const { checkBadges } = require('../services/badgeService');
const { checkMessage, executeAction } = require('../services/automodService');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    try {
      // Custom command check (prefix !)
      if (message.content.startsWith('!')) {
        const cmdName = message.content.slice(1).split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (cmdName) {
          const customCmd = await CustomCommand.findOne({
            where: { guild_id: message.guild.id, name: cmdName, is_active: true },
          });
          if (customCmd) {
            const embed = baseEmbed(customCmd.embed_title || `!${cmdName}`)
              .setDescription(customCmd.response);
            if (customCmd.embed_image) embed.setImage(customCmd.embed_image);
            await message.channel.send({ embeds: [embed] });
            return; // Don't track XP for custom commands
          }
        }
      }

      // Automod check (before tracking)
      const amResult = await checkMessage(message);
      if (amResult.violated) {
        await executeAction(message, amResult.rule, amResult.reason);
        return; // Don't track XP for deleted messages
      }

      await Guild.findOrCreate({
        where: { guild_id: message.guild.id },
        defaults: { guild_id: message.guild.id, name: message.guild.name },
      });
      const [user] = await User.findOrCreate({
        where: { user_id: message.author.id, guild_id: message.guild.id },
        defaults: {
          user_id: message.author.id,
          guild_id: message.guild.id,
          username: message.author.username,
        },
      });
      await user.increment('total_messages');
      await ActivityLog.create({
        user_id: message.author.id,
        guild_id: message.guild.id,
        event_type: 'message',
        channel_id: message.channel.id,
        amount: 1,
      });
      // Award XP for the message.
      await awardMessageXp(user, client, message.channel).catch(() => {});
      // Check badges (throttled — only every 10 messages).
      if (user.total_messages % 10 === 0) {
        await checkBadges(user, message.guild).catch(() => {});
      }
    } catch (err) {
      logger.error('messageCreate tracking error:', err);
    }
  },
};
