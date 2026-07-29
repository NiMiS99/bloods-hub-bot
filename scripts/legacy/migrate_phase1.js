// scripts/migrate_phase1.js
// Migration: adds level_rewards, automod_rules, discord_logs tables
// and new columns to guilds (welcome, automod, level rewards).
const sequelize = require('../src/db').sequelize;

async function run() {
  console.log('=== Phase 1 Migration ===\n');

  // 1. New tables (sequelize.sync creates them if missing)
  console.log('1. Syncing new tables...');
  await sequelize.sync({ alter: false });
  console.log('   Tables synced.\n');

  // 2. Add new columns to guilds table
  console.log('2. Adding new columns to guilds...');
  const queries = [
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS welcome_enabled TINYINT(1) DEFAULT 0",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS welcome_message VARCHAR(500) NULL",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS welcome_image_enabled TINYINT(1) DEFAULT 1",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS auto_role_id BIGINT UNSIGNED NULL",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS level_reward_channel_id BIGINT UNSIGNED NULL",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS automod_enabled TINYINT(1) DEFAULT 0",
    "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS automod_log_channel_id BIGINT UNSIGNED NULL",
  ];

  for (const q of queries) {
    try {
      await sequelize.query(q);
      console.log('   OK:', q.substring(0, 60));
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('   SKIP (exists):', q.substring(50, 80));
      } else {
        console.log('   WARN:', err.message.substring(0, 80));
      }
    }
  }

  console.log('\n=== Migration complete ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
