// src/db/models/Reminder.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Reminder = sequelize.define('Reminder', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    remind_at: { type: DataTypes.DATE, allowNull: false },
    is_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'reminders',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id', 'is_sent'] },
    ],
  });

  return Reminder;
};
