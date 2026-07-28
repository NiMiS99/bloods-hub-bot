// src/db/models/BpItem.js
// WoW items available for loot rolls.
module.exports = (sequelize, DataTypes) => {
  const BpItem = sequelize.define(
    'BpItem',
    {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      boss: { type: DataTypes.STRING(128), allowNull: true },
      slot: { type: DataTypes.STRING(64), allowNull: true },
      min_bid: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      note: { type: DataTypes.STRING(256), allowNull: true },
    },
    {
      tableName: 'bp_items',
      indexes: [
        { fields: ['guild_id'] },
        { fields: ['boss'] },
      ],
    }
  );
  return BpItem;
};
