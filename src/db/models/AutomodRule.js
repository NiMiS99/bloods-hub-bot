// src/db/models/AutomodRule.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'automod_rule',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      rule_type: {
        type: DataTypes.ENUM('word_filter', 'spam', 'link', 'mention_spam', 'caps'),
        allowNull: false,
      },
      is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      words: { type: DataTypes.JSON, allowNull: true },
      action: {
        type: DataTypes.ENUM('warn', 'mute', 'delete', 'kick'),
        allowNull: false,
        defaultValue: 'delete',
      },
      mute_duration: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      exempt_roles: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'automod_rules', timestamps: true, underscored: true }
  );
};
