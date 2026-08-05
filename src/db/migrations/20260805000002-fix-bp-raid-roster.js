// src/db/migrations/20260805000002-fix-bp-raid-roster.js
// Ensures bp_raid_roster table has correct columns.
// The model uses JSON members array, no user_id column needed.
// This migration just verifies the schema is correct.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('bp_raid_roster')) {
      await queryInterface.createTable('bp_raid_roster', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        guild_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, unique: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        members: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false },
      });
      console.log('  Created bp_raid_roster table');
    } else {
      // Verify no user_id column exists (it was incorrectly added by association)
      const [cols] = await queryInterface.sequelize.query('SHOW COLUMNS FROM bp_raid_roster LIKE "user_id"');
      if (cols.length > 0) {
        await queryInterface.removeColumn('bp_raid_roster', 'user_id');
        console.log('  Removed incorrect user_id column from bp_raid_roster');
      } else {
        console.log('  bp_raid_roster schema OK (no user_id column)');
      }
    }
  },

  down: async () => {
    console.log('Down migration: no changes (safety)');
  },
};
