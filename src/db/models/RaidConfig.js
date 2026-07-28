// src/db/models/RaidConfig.js
// Raid requirements configuration per guild.
// One row per guild — defines minimum stats to be "raid eligible".
module.exports = (sequelize, DataTypes) => {
  const RaidConfig = sequelize.define(
    'RaidConfig',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
      // Minimum requirements
      min_ilvl: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 600 },
      min_raid_attendance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      require_tier_bonus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      require_achievement: { type: DataTypes.STRING(128), allowNull: true },
      // Raid schedule
      raid_days: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [3, 4],
        get() {
          const raw = this.getDataValue('raid_days');
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string') {
            try { return JSON.parse(raw); } catch { return [3, 4]; }
          }
          return [3, 4];
        },
      },
      raid_time: { type: DataTypes.STRING(8), allowNull: false, defaultValue: '21:00' },
      raid_name: { type: DataTypes.STRING(128), allowNull: false, defaultValue: 'Raid Gilda' },
      // Discord role for eligible players
      eligible_role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      // Channel for raid announcements
      announce_channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'raid_config',
    }
  );
  return RaidConfig;
};
