// src/db/models/Starboard.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Starboard = sequelize.define('Starboard', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    original_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    original_message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    original_author_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    starboard_message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    star_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    content: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'starboard_messages',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['guild_id', 'original_message_id'] },
    ],
  });

  return Starboard;
};
