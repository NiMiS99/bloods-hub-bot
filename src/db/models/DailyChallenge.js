// src/db/models/DailyChallenge.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'daily_challenge',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      challenge_type: { type: DataTypes.STRING(50), allowNull: false },
      challenge_desc: { type: DataTypes.STRING(300), allowNull: false },
      target_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      current_amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reward_xp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 },
      scope: { type: DataTypes.ENUM('daily', 'weekly'), allowNull: false, defaultValue: 'daily' },
      status: { type: DataTypes.ENUM('active', 'completed', 'expired', 'claimed'), allowNull: false, defaultValue: 'active' },
      assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      completed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'daily_challenges',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'user_id', 'assigned_at'] },
      ],
    }
  );
};
