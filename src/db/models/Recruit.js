// src/db/models/Recruit.js
// Tracks recruiting pipeline: from first contact to full member.
module.exports = (sequelize, DataTypes) => {
  const Recruit = sequelize.define(
    'Recruit',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      discord_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      discord_tag: { type: DataTypes.STRING(128), allowNull: true },
      bnet_tag: { type: DataTypes.STRING(128), allowNull: true },
      character_name: { type: DataTypes.STRING(64), allowNull: true },
      character_class: { type: DataTypes.STRING(32), allowNull: true },
      character_ilvl: { type: DataTypes.INTEGER, allowNull: true },
      experience: { type: DataTypes.TEXT, allowNull: true },
      source: { type: DataTypes.STRING(64), allowNull: true }, // 'discord', 'reddit', 'in-game', 'friend'
      status: {
        type: DataTypes.ENUM('first_contact', 'colloquio_scheduled', 'colloquio_done', 'trial', 'approved', 'rejected', 'left'),
        allowNull: false,
        defaultValue: 'first_contact',
      },
      trial_start_date: { type: DataTypes.DATEONLY, allowNull: true },
      trial_end_date: { type: DataTypes.DATEONLY, allowNull: true },
      trial_notes: { type: DataTypes.TEXT, allowNull: true },
      approved_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      rejected_reason: { type: DataTypes.TEXT, allowNull: true },
      contacted_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'recruits',
      indexes: [
        { unique: true, fields: ['guild_id', 'discord_id'] },
        { fields: ['status'] },
        { fields: ['trial_end_date'] },
      ],
    }
  );
  return Recruit;
};
