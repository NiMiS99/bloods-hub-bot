// src/db/models/AuditLog.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'audit_log',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      actor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      action: { type: DataTypes.STRING(64), allowNull: false },
      target_type: { type: DataTypes.STRING(32), allowNull: true },
      target_id: { type: DataTypes.STRING(64), allowNull: true },
      details: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'audit_log', timestamps: true, updatedAt: false }
  );
};
