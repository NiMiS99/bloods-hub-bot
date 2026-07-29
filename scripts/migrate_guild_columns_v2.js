// scripts/migrate_guild_columns_v2.js
// Adds starboard and birthday columns to guilds table.
const { sequelize } = require('../src/db');
const logger = require('../src/utils/logger');

async function migrate() {
  const queries = [
    "ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS `starboard_channel_id` BIGINT UNSIGNED NULL",
    "ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS `starboard_threshold` INT NULL DEFAULT 5",
    "ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS `birthday_channel_id` BIGINT UNSIGNED NULL",
    "ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS `birthday_role_id` BIGINT UNSIGNED NULL",
  ];

  for (const q of queries) {
    try {
      await sequelize.query(q);
      console.log(`OK: ${q.replace('ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS ', '')}`);
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log(`SKIP (exists): ${q.replace('ALTER TABLE `guilds` ADD COLUMN IF NOT EXISTS ', '')}`);
      } else {
        console.error(`ERROR: ${err.message}`);
      }
    }
  }

  // Also create new tables if they don't exist
  try {
    await sequelize.sync({ alter: false });
    console.log('OK: sync completed (creates missing tables)');
  } catch (err) {
    console.error(`Sync error: ${err.message}`);
  }

  console.log('\nMigration complete.');
  process.exit(0);
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
