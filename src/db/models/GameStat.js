// src/db/models/GameStat.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'game_stat',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      metric: { type: DataTypes.STRING(64), allowNull: false },
      value_num: { type: DataTypes.DOUBLE, allowNull: true },
      value_str: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'game_stats', timestamps: true, createdAt: false }
  );
};
