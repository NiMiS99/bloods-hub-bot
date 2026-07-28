// src/db/models/BpActiveRoll.js
// Active roll session: one per guild at a time.
// bids stored as JSON: { userId: { bid, roll, score, updated_at } }
module.exports = (sequelize, DataTypes) => {
  const BpActiveRoll = sequelize.define(
    'BpActiveRoll',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      is_open: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      started_at: { type: DataTypes.DATE, allowNull: true },
      started_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      item_id: { type: DataTypes.STRING(64), allowNull: true },
      item_name: { type: DataTypes.STRING(128), allowNull: true },
      item_slot: { type: DataTypes.STRING(64), allowNull: true },
      item_boss: { type: DataTypes.STRING(128), allowNull: true },
      item_note: { type: DataTypes.STRING(256), allowNull: true },
      min_bid: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bids: { type: DataTypes.JSON, allowNull: true },
      closed_at: { type: DataTypes.DATE, allowNull: true },
      result: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: 'bp_active_roll',
    }
  );
  return BpActiveRoll;
};
