// src/db/models/Game.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'game',
    {
      id: { type: DataTypes.SMALLINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      category: { type: DataTypes.STRING(50), allowNull: false },
      api_provider: { type: DataTypes.STRING(50), allowNull: true },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      category_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      icon_url: { type: DataTypes.STRING(255), allowNull: true },
      color_hex: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0x5865f2 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'games', timestamps: true }
  );
};
