// src/db/models/GameNight.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'game_night',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(200), allowNull: false },
      game_code: { type: DataTypes.STRING(50), allowNull: false },
      game_name: { type: DataTypes.STRING(100), allowNull: false },
      cron_schedule: { type: DataTypes.STRING(100), allowNull: false },
      voice_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      text_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      slots: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      last_triggered_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'game_nights',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'is_active'] },
      ],
    }
  );
};
