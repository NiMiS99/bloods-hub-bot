// src/db/models/Warning.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'warning',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      issued_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      reason: { type: DataTypes.STRING(500), allowNull: false },
      severity: { type: DataTypes.ENUM('low', 'medium', 'high'), allowNull: false, defaultValue: 'low' },
    },
    { tableName: 'warnings', timestamps: true, underscored: true }
  );
};
