// src/db/models/LfgSession.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'lfg_session',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      captain_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      game_name: { type: DataTypes.STRING(100), allowNull: false },
      game_code: { type: DataTypes.STRING(50), allowNull: true },
      mode: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Qualsiasi' },
      slots: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      notes: { type: DataTypes.STRING(500), allowNull: true },
      participants: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      status: { type: DataTypes.ENUM('open', 'full', 'closed', 'expired'), allowNull: false, defaultValue: 'open' },
      expires_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'lfg_sessions',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'status'] },
      ],
    }
  );
};
