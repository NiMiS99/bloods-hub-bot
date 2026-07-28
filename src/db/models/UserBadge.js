// src/db/models/UserBadge.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'user_badge',
    {
      user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      badge_code: { type: DataTypes.STRING(32), primaryKey: true },
      awarded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'user_badges', timestamps: false, underscored: true }
  );
};
