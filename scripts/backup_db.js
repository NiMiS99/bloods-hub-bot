// scripts/backup_db.js
// Daily DB backup script. Run via Windows Task Scheduler or PM2 cron.
// Keeps the last 7 backup files.
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const filename = `backup_${date}.sql`;
const filepath = path.join(backupDir, filename);

const cmd = `mysqldump -h ${process.env.DB_HOST || '127.0.0.1'} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > "${filepath}"`;

try {
  execSync(cmd, { stdio: 'pipe' });
  console.log(`Backup created: ${filepath}`);

  // Clean up old backups (keep last 7).
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
    .sort()
    .reverse();
  for (const oldFile of files.slice(7)) {
    fs.unlinkSync(path.join(backupDir, oldFile));
    console.log(`Deleted old backup: ${oldFile}`);
  }
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
}
