// src/db/models/EventParticipant.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'event_participant',
    {
      event_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'event_participants', timestamps: true, underscored: true }
  );
};
