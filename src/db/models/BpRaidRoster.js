// src/db/models/BpRaidRoster.js
// Raid roster: members allowed to roll in active raid.
// One row per guild (singleton), members stored as JSON array of user IDs.
module.exports = (sequelize, DataTypes) => {
  const BpRaidRoster = sequelize.define(
    'BpRaidRoster',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      members: { type: DataTypes.JSON, allowNull: true },
    },
    {
      tableName: 'bp_raid_roster',
    }
  );
  return BpRaidRoster;
};
