// src/db/models/BpLootHistory.js
// Loot history: items won via roll, with bid/roll/score.
module.exports = (sequelize, DataTypes) => {
  const BpLootHistory = sequelize.define(
    'BpLootHistory',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      raid_name: { type: DataTypes.STRING(128), allowNull: true },
      item_id: { type: DataTypes.STRING(64), allowNull: false },
      item_name: { type: DataTypes.STRING(128), allowNull: false },
      boss: { type: DataTypes.STRING(128), allowNull: true },
      winner_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      bid: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      roll: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      score: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      participants: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      closed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'bp_loot_history',
      indexes: [
        { fields: ['guild_id'] },
        { fields: ['winner_id'] },
        { fields: ['raid_name'] },
      ],
    }
  );
  return BpLootHistory;
};
