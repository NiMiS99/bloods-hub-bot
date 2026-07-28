// src/db/models/WowEventSignup.js
// Signup for a WoW spedizione: user + class + spec.
module.exports = (sequelize, DataTypes) => {
  const WowEventSignup = sequelize.define(
    'WowEventSignup',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      event_id: { type: DataTypes.STRING(8), allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      class_key: { type: DataTypes.STRING(32), allowNull: false },
      class_name: { type: DataTypes.STRING(64), allowNull: false },
      spec: { type: DataTypes.STRING(64), allowNull: false },
    },
    {
      tableName: 'wow_event_signups',
      indexes: [
        { unique: true, fields: ['event_id', 'user_id'] },
        { fields: ['guild_id'] },
      ],
    }
  );
  return WowEventSignup;
};
