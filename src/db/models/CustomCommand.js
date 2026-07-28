// src/db/models/CustomCommand.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomCommand = sequelize.define('CustomCommand', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(32), allowNull: false },
    response: { type: DataTypes.TEXT, allowNull: false },
    embed_title: { type: DataTypes.STRING(200), allowNull: true },
    embed_color: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0x8b0000 },
    embed_image: { type: DataTypes.STRING(500), allowNull: true },
    created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'custom_commands',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['guild_id', 'name'] },
    ],
  });

  return CustomCommand;
};
