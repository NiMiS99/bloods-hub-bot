// scripts/backup_db.js
// Manual DB backup script — run with `npm run backup`.
// Uses Sequelize export (no mysqldump required) or mysqldump if available.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runBackup } = require('../src/services/backupScheduler');

console.log('Starting manual backup...');
runBackup();

// Wait for backup to complete (runBackup is async for Sequelize path)
setTimeout(() => {
  const fs = require('fs');
  const backupDir = path.join(__dirname, '..', 'backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_'))
      .sort()
      .reverse();
    if (files.length > 0) {
      const stat = fs.statSync(path.join(backupDir, files[0]));
      console.log(`✅ Backup completed: ${files[0]} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log('⚠️ No backup file found — check logs for errors');
    }
  }
  process.exit(0);
}, 10000);
