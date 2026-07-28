// src/db/models/CommunityEvent.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'community_event',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      scheduled_at: { type: DataTypes.DATE, allowNull: false },
      duration_minutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 60 },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'events', timestamps: true, underscored: true }
  );
};
