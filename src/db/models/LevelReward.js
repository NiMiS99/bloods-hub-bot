// src/db/models/LevelReward.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'level_reward',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      message: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'level_rewards', timestamps: true, underscored: true }
  );
};
