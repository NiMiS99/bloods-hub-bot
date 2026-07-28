// src/db/models/ExternalAccount.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'external_account',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      provider: { type: DataTypes.STRING(32), allowNull: false },
      external_id: { type: DataTypes.STRING(100), allowNull: false },
      region: { type: DataTypes.STRING(8), allowNull: true },
      verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'external_accounts', timestamps: true, updatedAt: false }
  );
};
