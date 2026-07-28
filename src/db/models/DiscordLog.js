// src/db/models/DiscordLog.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'discord_log',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      event_type: {
        type: DataTypes.ENUM(
          'message_delete',
          'message_update',
          'member_join',
          'member_leave',
          'member_kick',
          'member_ban',
          'member_unban',
          'role_create',
          'role_delete',
          'role_update',
          'channel_create',
          'channel_delete',
          'channel_update'
        ),
        allowNull: false,
      },
      actor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      target_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      target_type: { type: DataTypes.STRING(32), allowNull: true },
      details: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'discord_logs', timestamps: true, updatedAt: false, underscored: true }
  );
};
