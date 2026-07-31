// src/db/models/Feedback.js
// Tracks admin feedback tickets from the #modifiche-da-apportare channel.
// Structured modal form → ticket → approval → fix → resolution.
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'feedback',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      guild_id: { type: DataTypes.STRING(32), allowNull: false },
      channel_id: { type: DataTypes.STRING(32), allowNull: false },
      message_id: { type: DataTypes.STRING(32), allowNull: false },
      thread_id: { type: DataTypes.STRING(32), allowNull: true },
      author_id: { type: DataTypes.STRING(32), allowNull: false },
      author_username: { type: DataTypes.STRING(64), allowNull: false },
      // Structured fields from modal form
      title: { type: DataTypes.STRING(200), allowNull: false },
      category: {
        type: DataTypes.ENUM('permissions', 'bot_command', 'bot_bug', 'dashboard', 'feature_request', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      affected_channels: { type: DataTypes.STRING(500), allowNull: true },
      affected_roles: { type: DataTypes.STRING(500), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: false },
      // Workflow status
      status: {
        type: DataTypes.ENUM('open', 'approved', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      // Approval tracking
      approved_by: { type: DataTypes.STRING(32), allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      // Fix tracking
      fix_notes: { type: DataTypes.TEXT, allowNull: true },
      fix_commit: { type: DataTypes.STRING(100), allowNull: true },
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
