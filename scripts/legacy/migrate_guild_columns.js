// scripts/migrate_guild_columns.js
const db = require('../src/db');

(async () => {
  try {
    const queries = [
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS prefix VARCHAR(10) NULL DEFAULT '/'",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS language VARCHAR(5) NULL DEFAULT 'it'",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS xp_enabled BOOLEAN NULL DEFAULT TRUE",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS xp_per_message INT NULL DEFAULT 1",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS xp_per_voice_minute INT NULL DEFAULT 5",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS xp_cooldown_seconds INT NULL DEFAULT 60",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS log_channel_id BIGINT UNSIGNED NULL",
      "ALTER TABLE guilds ADD COLUMN IF NOT EXISTS announcements_channel_id BIGINT UNSIGNED NULL",
    ];

    for (const q of queries) {
      try {
        await db.sequelize.query(q);
        console.log('OK:', q.substring(0, 60));
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log('SKIP (exists):', q.substring(0, 60));
        } else {
          console.error('ERR:', e.message);
        }
      }
    }

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
