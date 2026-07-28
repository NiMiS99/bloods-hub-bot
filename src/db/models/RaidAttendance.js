// src/db/models/RaidAttendance.js
// Tracks raid attendance: who participated in each raid session.
module.exports = (sequelize, DataTypes) => {
  const RaidAttendance = sequelize.define(
    'RaidAttendance',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      raid_name: { type: DataTypes.STRING(128), allowNull: false },
      raid_date: { type: DataTypes.DATEONLY, allowNull: false },
      attended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      noted_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'raid_attendance',
      indexes: [
        { fields: ['guild_id', 'user_id'] },
        { fields: ['raid_date'] },
        { unique: true, fields: ['guild_id', 'user_id', 'raid_date', 'raid_name'] },
      ],
    }
  );
  return RaidAttendance;
};
