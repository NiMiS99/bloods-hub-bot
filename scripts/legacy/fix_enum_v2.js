// scripts/fix_enum_v2.js
const { sequelize } = require('../src/db');
(async () => {
  try {
    const [rows] = await sequelize.query("SHOW COLUMNS FROM guide_messages LIKE 'guide_type'");
    console.log('Current:', rows[0].Type);
    await sequelize.query("ALTER TABLE guide_messages MODIFY COLUMN guide_type ENUM('game_selection','generale','composizioni','news','comandi','comunicazioni_gilda','avvisi_gilda','annunci_gilda','prenotazioni_pve','prenotazioni_pvp','avvisi_community','annunci_community','comunicazioni_game') NOT NULL");
    console.log('✓ ENUM updated with all new guide types');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
