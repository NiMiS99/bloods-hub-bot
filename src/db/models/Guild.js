// src/db/models/Guild.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'guild',
    {
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      legacy_wow_category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      welcome_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      rules_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      role_selection_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      everyone_role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      mod_log_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      settings: { type: DataTypes.JSON, allowNull: true },
      prefix: { type: DataTypes.STRING(10), allowNull: true, defaultValue: '/' },
      language: { type: DataTypes.STRING(5), allowNull: true, defaultValue: 'it' },
      xp_enabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
      xp_per_message: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
      xp_per_voice_minute: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 5 },
      xp_cooldown_seconds: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 60 },
      log_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      announcements_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Welcome system
      welcome_enabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      welcome_message: { type: DataTypes.STRING(500), allowNull: true },
      welcome_image_enabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
      auto_role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Level rewards
      level_reward_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      level_up_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      level_up_message: { type: DataTypes.STRING(500), allowNull: true, defaultValue: '🎉 **{user}** ha raggiunto il livello **{level}**!' },
      // Automod
      automod_enabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      automod_log_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Temp voice
      temp_voice_creator_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Starboard
      starboard_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      starboard_threshold: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 5 },
      // Birthday
      birthday_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      birthday_role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    { tableName: 'guilds', timestamps: true }
  );
};
