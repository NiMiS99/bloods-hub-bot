// src/db/models/BpUser.js
// DKP (Bloods Points) balance per user per guild.
module.exports = (sequelize, DataTypes) => {
  const BpUser = sequelize.define(
    'BpUser',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      dkp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'bp_users',
      indexes: [
        { unique: true, fields: ['guild_id', 'user_id'] },
      ],
    }
  );
  return BpUser;
};
