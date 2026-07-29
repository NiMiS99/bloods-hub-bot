// src/server/routes/settings.js
const express = require('express');
const { Guild } = require('../../db');
const { requireAuth, requireGuildMember, requireAdmin, requireAdminOnly } = require('../middleware/auth');
const { recordAudit } = require('../../utils/auditLog');

module.exports = function (client, jwtSecret) {
  const router = express.Router();

  // GET /api/guilds/:guildId/settings — guild settings
  router.get('/:guildId/settings', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), async (req, res) => {
    try {
      const guild = await Guild.findOne({ where: { guild_id: req.guild.id } });
      res.json({
        guild: guild ? {
          id: guild.guild_id,
          guildId: guild.guild_id,
          name: guild.name,
          prefix: guild.prefix,
          language: guild.language || 'it',
          xpEnabled: guild.xp_enabled ?? true,
          xpPerMessage: guild.xp_per_message ?? 1,
          xpPerVoiceMinute: guild.xp_per_voice_minute ?? 5,
          xpCooldownSeconds: guild.xp_cooldown_seconds ?? 60,
          welcomeChannelId: guild.welcome_channel_id,
          logChannelId: guild.log_channel_id,
          announcementsChannelId: guild.announcements_channel_id,
          // Welcome system
          welcomeEnabled: guild.welcome_enabled ?? false,
          welcomeMessage: guild.welcome_message || 'Benvenuto {user} in **{server}**!',
          welcomeImageEnabled: guild.welcome_image_enabled ?? true,
          autoRoleId: guild.auto_role_id,
          // Level rewards
          levelRewardChannelId: guild.level_reward_channel_id,
          // Automod
          automodEnabled: guild.automod_enabled ?? false,
          automodLogChannelId: guild.automod_log_channel_id,
          // Temp voice
          tempVoiceCreatorChannelId: guild.temp_voice_creator_channel_id || null,
        } : null,
        discord: {
          name: req.guild.name,
          icon: req.guild.iconURL({ size: 256 }),
          memberCount: req.guild.memberCount,
          createdAt: req.guild.createdAt,
          ownerId: req.guild.ownerId,
          roles: req.guild.roles.cache
            .filter((r) => r.name !== '@everyone' && !r.managed)
            .sort((a, b) => b.position - a.position)
            .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }))
            .slice(0, 20),
          channels: {
            categories: req.guild.channels.cache.filter((c) => c.type === 4).size,
            text: req.guild.channels.cache.filter((c) => c.type === 0).size,
            voice: req.guild.channels.cache.filter((c) => c.type === 2).size,
            textChannels: req.guild.channels.cache
              .filter((c) => c.type === 0)
              .sort((a, b) => a.position - b.position)
              .map((c) => ({ id: c.id, name: c.name }))
              .slice(0, 100),
          },
        },
      });
    } catch {
      res.status(500).json({ error: 'Errore recupero impostazioni' });
    }
  });

  // PUT /api/guilds/:guildId/settings — update guild settings
  router.put('/:guildId/settings', requireAuth(jwtSecret), requireGuildMember(client), requireAdmin(), requireAdminOnly(), async (req, res) => {
    try {
      const {
        xpEnabled, xpPerMessage, xpPerVoiceMinute, xpCooldownSeconds,
        welcomeChannelId, logChannelId, announcementsChannelId, language,
        welcomeEnabled, welcomeMessage, welcomeImageEnabled, autoRoleId,
        levelRewardChannelId, automodEnabled, automodLogChannelId,
        tempVoiceCreatorChannelId,
        levelUpChannelId, levelUpMessage,
      } = req.body;

      const [guild, _created] = await Guild.findOrCreate({
        where: { guild_id: req.guild.id },
        defaults: { guild_id: req.guild.id, name: req.guild.name },
      });

      const updates = {};
      if (xpEnabled !== undefined) updates.xp_enabled = xpEnabled;
      if (xpPerMessage !== undefined) updates.xp_per_message = xpPerMessage;
      if (xpPerVoiceMinute !== undefined) updates.xp_per_voice_minute = xpPerVoiceMinute;
      if (xpCooldownSeconds !== undefined) updates.xp_cooldown_seconds = xpCooldownSeconds;
      if (welcomeChannelId !== undefined) updates.welcome_channel_id = welcomeChannelId;
      if (logChannelId !== undefined) updates.log_channel_id = logChannelId;
      if (announcementsChannelId !== undefined) updates.announcements_channel_id = announcementsChannelId;
      if (language !== undefined) updates.language = language;
      // Welcome
      if (welcomeEnabled !== undefined) updates.welcome_enabled = welcomeEnabled;
      if (welcomeMessage !== undefined) updates.welcome_message = welcomeMessage;
      if (welcomeImageEnabled !== undefined) updates.welcome_image_enabled = welcomeImageEnabled;
      if (autoRoleId !== undefined) updates.auto_role_id = autoRoleId || null;
      // Level rewards
      if (levelRewardChannelId !== undefined) updates.level_reward_channel_id = levelRewardChannelId || null;
      // Automod
      if (automodEnabled !== undefined) updates.automod_enabled = automodEnabled;
      if (automodLogChannelId !== undefined) updates.automod_log_channel_id = automodLogChannelId || null;
      // Temp voice
      if (tempVoiceCreatorChannelId !== undefined) updates.temp_voice_creator_channel_id = tempVoiceCreatorChannelId || null;
      // Level-up
      if (levelUpChannelId !== undefined) updates.level_up_channel_id = levelUpChannelId || null;
      if (levelUpMessage !== undefined) updates.level_up_message = levelUpMessage;

      await guild.update(updates);

      await recordAudit({
        guildId: req.guild.id,
        actorId: req.user.id,
        action: 'dashboard.settings.update',
        targetType: 'guild',
        targetId: req.guild.id,
        details: updates,
      });

      res.json({ success: true, guild });
    } catch {
      res.status(500).json({ error: 'Errore aggiornamento impostazioni' });
    }
  });

  return router;
};
