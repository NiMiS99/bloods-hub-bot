// scripts/fix_enum.js
const { sequelize } = require('../src/db');
(async () => {
  try {
    const [rows] = await sequelize.query("SHOW COLUMNS FROM guide_messages LIKE 'guide_type'");
    console.log('Current:', rows[0].Type);
    await sequelize.query("ALTER TABLE guide_messages MODIFY COLUMN guide_type ENUM('game_selection','generale','composizioni','news','comandi') NOT NULL");
    console.log('✓ ENUM updated with comandi');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
