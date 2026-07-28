// src/db/models/UserGame.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'user_game',
    {
      user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, primaryKey: true },
      self_assigned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'user_games', timestamps: true, updatedAt: false, createdAt: 'joined_at' }
  );
};
