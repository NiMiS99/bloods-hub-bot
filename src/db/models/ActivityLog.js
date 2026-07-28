// src/db/models/ActivityLog.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'activity_log',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      event_type: { type: DataTypes.STRING(20), allowNull: false },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      amount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'activity_log', timestamps: false }
  );
};
