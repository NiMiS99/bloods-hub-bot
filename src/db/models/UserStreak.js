// src/db/models/UserStreak.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'user_streak',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      streak_type: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'daily' },
      current_streak: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      longest_streak: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      last_claimed_at: { type: DataTypes.DATE, allowNull: true },
      total_claimed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'user_streaks',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'user_id'] },
      ],
    }
  );
};
