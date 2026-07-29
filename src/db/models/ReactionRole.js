// src/db/models/ReactionRole.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReactionRole = sequelize.define('ReactionRole', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    emoji: { type: DataTypes.STRING(100), allowNull: false },
    role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    description: { type: DataTypes.STRING(200), allowNull: true },
  }, {
    tableName: 'reaction_roles',
    underscored: true,
    timestamps: true,
  });

  return ReactionRole;
};
