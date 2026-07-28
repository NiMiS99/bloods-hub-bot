// src/db/models/GameMode.js
// Private game servers made available to the community.
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GameMode = sequelize.define('GameMode', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    game_code: { type: DataTypes.STRING(32), allowNull: false }, // e.g. 'minecraft', 'wow', 'ark'
    game_name: { type: DataTypes.STRING(100), allowNull: false }, // display name
    description: { type: DataTypes.TEXT, allowNull: true },
    connect_info: { type: DataTypes.STRING(500), allowNull: true }, // IP, port, or connection instructions
    connect_url: { type: DataTypes.STRING(255), allowNull: true }, // optional URL
    max_players: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM('online', 'offline', 'maintenance'), allowNull: false, defaultValue: 'offline' },
    version: { type: DataTypes.STRING(50), allowNull: true }, // server version/modpack
    image_url: { type: DataTypes.STRING(500), allowNull: true },
    color_hex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0x8b0000 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    current_players: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  }, {
    tableName: 'game_modes',
    underscored: true,
    timestamps: true,
  });

  return GameMode;
};
