// src/db/models/RaidEligibility.js
// Per-user raid eligibility snapshot — cached result of the last check.
module.exports = (sequelize, DataTypes) => {
  const RaidEligibility = sequelize.define(
    'RaidEligibility',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      // Snapshot of stats at last check
      ilvl_equipped: { type: DataTypes.INTEGER, allowNull: true },
      ilvl_avg: { type: DataTypes.INTEGER, allowNull: true },
      has_tier_bonus: { type: DataTypes.BOOLEAN, allowNull: true },
      tier_bonus_count: { type: DataTypes.INTEGER, allowNull: true },
      has_achievement: { type: DataTypes.BOOLEAN, allowNull: true },
      raid_attendance: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      // Eligibility result
      is_eligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      failure_reasons: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
          const raw = this.getDataValue('failure_reasons');
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return []; }
          }
          return [];
        },
      },
      // Tracking
      last_checked_at: { type: DataTypes.DATE, allowNull: true },
      battle_tag: { type: DataTypes.STRING(100), allowNull: true },
      character_name: { type: DataTypes.STRING(64), allowNull: true },
      character_class: { type: DataTypes.STRING(64), allowNull: true },
      character_level: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'raid_eligibility',
      indexes: [
        { unique: true, fields: ['guild_id', 'user_id'] },
      ],
    }
  );
  return RaidEligibility;
};
