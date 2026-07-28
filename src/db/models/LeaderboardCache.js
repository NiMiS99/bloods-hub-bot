// src/db/models/LeaderboardCache.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'leaderboard_cache',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      metric: { type: DataTypes.STRING(64), allowNull: false },
      scope: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'guild' },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
        get() {
          const raw = this.getDataValue('payload');
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return []; }
          }
          return raw;
        },
      },
      generated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'leaderboard_cache', timestamps: false }
  );
};
