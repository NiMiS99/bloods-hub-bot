// src/services/backupScheduler.js
// Daily DB backup scheduler — runs mysqldump at 4:00 AM and keeps 30 backups.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30;

let _interval = null;

function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const db = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'bloods_hub_db',
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${db.name}_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  const env = { ...process.env, MYSQL_PWD: db.password };
  const cmd = `mysqldump -h ${db.host} -P ${db.port} -u ${db.user} --single-transaction --routines --triggers --events ${db.name} | gzip > "${filepath}"`;

  try {
    execSync(cmd, { env, stdio: 'pipe' });
    const size = fs.statSync(filepath).size;
    logger.info(`BackupScheduler: backup created ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    cleanOld();
  } catch (err) {
    logger.error(`BackupScheduler: backup failed: ${err.message}`);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}

function cleanOld() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
    .map((f) => ({ name: f, path: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  const toDelete = files.slice(MAX_BACKUPS);
  for (const f of toDelete) {
    fs.unlinkSync(f.path);
    logger.info(`BackupScheduler: removed old backup ${f.name}`);
  }
}

function start() {
  // Check every hour if it's 4:00 AM
  _interval = setInterval(() => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
      runBackup();
    }
  }, 60000).unref();
  logger.info('BackupScheduler: started (daily at 4:00 AM).');
}

function stop() {
  if (_interval) clearInterval(_interval);
  _interval = null;
}

module.exports = { start, stop, runBackup };
