// src/db/models/User.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'user',
    {
      user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      username: { type: DataTypes.STRING(32), allowNull: false },
      legacy_wow_member: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      legacy_wow_rank: { type: DataTypes.STRING(50), allowNull: true },
      joined_discord_at: { type: DataTypes.DATE, allowNull: true },
      last_seen_at: { type: DataTypes.DATE, allowNull: true },
      total_voice_seconds: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      total_messages: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      xp: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      last_xp_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'users',
      timestamps: true,
      indexes: [
        { fields: ['guild_id', 'user_id'], unique: true },
        { fields: ['guild_id', 'level'] },
      ],
    }
  );
};
