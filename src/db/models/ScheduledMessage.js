// src/db/models/ScheduledMessage.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ScheduledMessage = sequelize.define('ScheduledMessage', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    embed_title: { type: DataTypes.STRING(200), allowNull: true },
    embed_color: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0x8b0000 },
    embed_image: { type: DataTypes.STRING(500), allowNull: true },
    cron_expr: { type: DataTypes.STRING(100), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    last_sent_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  }, {
    tableName: 'scheduled_messages',
    underscored: true,
    timestamps: true,
  });

  return ScheduledMessage;
};
