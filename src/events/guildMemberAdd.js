// src/events/guildMemberAdd.js
// New member onboarding: ensure user row, send welcome card, assign "Non Verificato".
const logger = require('../utils/logger');
const { User, Guild, DiscordLog } = require('../db');
const { sendWelcome } = require('../services/welcomeService');
const OnboardingService = require('../services/onboardingService');
const AdvancedLogger = require('../services/advancedLogger');
const AntiRaid = require('../services/antiRaidService');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const [guildRow] = await Guild.findOrCreate({
        where: { guild_id: member.guild.id },
        defaults: { guild_id: member.guild.id, name: member.guild.name },
      });
      await User.findOrCreate({
        where: { user_id: member.id, guild_id: member.guild.id },
        defaults: {
          user_id: member.id,
          guild_id: member.guild.id,
          username: member.user.username,
          joined_discord_at: member.joinedAt,
        },
      });
      logger.info(`Onboarded new member ${member.user.tag} in ${member.guild.name}.`);

      // Onboarding: assign "Non Verificato" role for verification gate
      await OnboardingService.handleNewMember(member);

      // Anti-raid: track join for mass-join detection
      await AntiRaid.trackJoin(member, client);

      // Advanced logging
      await AdvancedLogger.onMemberJoin(member);

      // Welcome card in channel
      await sendWelcome(member, guildRow);

      // Note: DM with onboarding instructions is sent by onboardingService.handleVerify
      // after the user clicks the "Verifica" button — no duplicate DM here.

      // Log to DiscordLog
      await DiscordLog.create({
        guild_id: member.guild.id,
        event_type: 'member_join',
        target_id: member.id,
        target_type: 'member',
        details: { username: member.user.username },
      }).catch(() => {});
    } catch (err) {
      logger.error('guildMemberAdd error:', err);
    }
  },
};
