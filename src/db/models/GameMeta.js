// src/db/models/GameMeta.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'game_meta',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      game_id: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      kind: { type: DataTypes.STRING(20), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true },
      url: { type: DataTypes.STRING(255), allowNull: true },
      fetched_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      posted_to_channel: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'game_meta', timestamps: false }
  );
};
