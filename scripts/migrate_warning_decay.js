// scripts/migrate_warning_decay.js
const { sequelize } = require('../src/db');
(async () => {
  try {
    await sequelize.query("ALTER TABLE `warnings` ADD COLUMN IF NOT EXISTS `expires_at` DATE NULL");
    await sequelize.query("ALTER TABLE `warnings` ADD COLUMN IF NOT EXISTS `is_expired` TINYINT(1) NOT NULL DEFAULT 0");
    console.log('OK: warnings columns added');
  } catch (e) { console.log(e.message); }
  process.exit(0);
})();
