// src/db/models/Giveaway.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Giveaway = sequelize.define('Giveaway', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    prize: { type: DataTypes.STRING(200), allowNull: false },
    winner_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    required_role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    ends_at: { type: DataTypes.DATE, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_ended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    winners: { type: DataTypes.TEXT, allowNull: true }, // JSON array of user IDs
    hosted_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  }, {
    tableName: 'giveaways',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['guild_id', 'is_ended'] },
    ],
  });

  return Giveaway;
};
