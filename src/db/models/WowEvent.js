// src/db/models/WowEvent.js
// WoW spedizione (event with class/spec signups).
module.exports = (sequelize, DataTypes) => {
  const WowEvent = sequelize.define(
    'WowEvent',
    {
      id: { type: DataTypes.STRING(8), primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      title: { type: DataTypes.STRING(128), allowNull: false },
      note: { type: DataTypes.TEXT, allowNull: true },
      when_iso: { type: DataTypes.DATE, allowNull: false },
      slots: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.ENUM('open', 'closed', 'canceled'), allowNull: false, defaultValue: 'open' },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'wow_events',
      indexes: [
        { fields: ['guild_id'] },
        { fields: ['status'] },
      ],
    }
  );
  return WowEvent;
};
