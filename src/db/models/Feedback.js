// src/db/models/Feedback.js
// Tracks admin feedback tickets from the #modifiche-da-apportare channel.
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'feedback',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      guild_id: { type: DataTypes.STRING(32), allowNull: false },
      channel_id: { type: DataTypes.STRING(32), allowNull: false },
      message_id: { type: DataTypes.STRING(32), allowNull: false },
      embed_message_id: { type: DataTypes.STRING(32), allowNull: true },
      author_id: { type: DataTypes.STRING(32), allowNull: false },
      author_username: { type: DataTypes.STRING(64), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      category: {
        type: DataTypes.ENUM('permissions', 'bot_command', 'bot_bug', 'dashboard', 'feature_request', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      status: {
        type: DataTypes.ENUM('open', 'analyzing', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      resolved_by: { type: DataTypes.STRING(32), allowNull: true },
    },
    {
      tableName: 'feedback',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['guild_id', 'status'] },
        { fields: ['guild_id', 'channel_id'] },
        { fields: ['author_id'] },
      ],
    }
  );
};
