// src/db/models/Birthday.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Birthday = sequelize.define('Birthday', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    birth_month: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    birth_day: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  }, {
    tableName: 'birthdays',
    underscored: true,
    timestamps: true,
    indexes: [
      { unique: true, fields: ['guild_id', 'user_id'] },
    ],
  });

  return Birthday;
};
