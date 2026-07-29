// src/events/guildMemberUpdate.js
const AdvancedLogger = require('../services/advancedLogger');
const { User } = require('../db');
const { awardXp } = require('../services/xpService');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, _client) {
    await AdvancedLogger.onGuildMemberUpdate(oldMember, newMember);

    // Detect server boost
    const wasBoosting = oldMember.premiumSinceTimestamp !== null;
    const isBoosting = newMember.premiumSinceTimestamp !== null;

    if (!wasBoosting && isBoosting) {
      // User started boosting — award XP + add community role
      try {
        const [user] = await User.findOrCreate({
          where: { user_id: newMember.id, guild_id: newMember.guild.id },
          defaults: { user_id: newMember.id, guild_id: newMember.guild.id },
        });
        await awardXp(user, 500); // 500 XP bonus for boosting
        logger.info(`Boost reward: ${newMember.user.tag} (+500 XP)`);

        // Add "Membro della community" role automatically (if not already Bloods)
        const COMMUNITY_ROLE_ID = '1421545567179243550';
        const BLOODS_ROLE_ID = '1013186233993810100';
        if (!newMember.roles.cache.has(BLOODS_ROLE_ID) && !newMember.roles.cache.has(COMMUNITY_ROLE_ID)) {
          await newMember.roles.add(COMMUNITY_ROLE_ID, 'Nitro Booster → Membro della community (auto)');
          logger.info(`Auto-role: ${newMember.user.tag} got community role from Nitro Boost`);
        }

        // Send thank you message
        const thankChannel = newMember.guild.channels.cache.find(
          (c) => c.name.toLowerCase().includes('benvenuto') || c.name.toLowerCase().includes('annunci')
        );
        if (thankChannel) {
          const { EmbedBuilder } = require('discord.js');
          const embed = new EmbedBuilder()
            .setTitle('💜 Server Boost!')
            .setColor(0xff73fa)
            .setDescription(
              `Grazie <@${newMember.id}> per aver boostato il server!\n\n` +
              `Hai ricevuto **+500 XP** come ricompensa! 🎁\n` +
              `Hai anche ottenuto automaticamente il ruolo **Membro della community**! 🎉\n\n` +
              `I booster aiutano la community a crescere e sbloccano vantaggi per tutti. 💜`
            )
            .setThumbnail(newMember.user.displayAvatarURL({ size: 128 }))
            .setTimestamp();
          await thankChannel.send({ embeds: [embed] }).catch(() => {});
        }
      } catch (err) {
        logger.error(`Boost reward error: ${err.message}`);
      }
    }
  },
};
