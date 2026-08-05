// src/services/backupScheduler.js
// Daily DB backup scheduler — exports all table data as JSON (no mysqldump needed).
// Runs at 4:00 AM, keeps 30 backups. Falls back to mysqldump if available.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30;

let _interval = null;

/**
 * Check if mysqldump is available on the system.
 */
function hasMysqldump() {
  try {
    execSync('mysqldump --version', { stdio: 'pipe', shell: process.platform === 'win32' ? 'cmd.exe' : undefined });
    return true;
  } catch {
    return false;
  }
}

/**
 * Backup using mysqldump (preferred — produces SQL restore file).
 */
function backupWithMysqldump(filepath) {
  const db = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'bloods_hub_db',
  };
  const env = { ...process.env, MYSQL_PWD: db.password };
  const cmd = `mysqldump -h ${db.host} -P ${db.port} -u ${db.user} --single-transaction --routines --triggers --events ${db.name} | gzip > "${filepath}"`;
  execSync(cmd, { env, stdio: 'pipe', shell: process.platform === 'win32' ? 'cmd.exe' : undefined });
}

/**
 * Backup using Sequelize (fallback — exports all rows as JSON).
 * Works without mysqldump installed.
 */
async function backupWithSequelize(filepath) {
  const { sequelize } = require('../db');
  const models = sequelize.models;
  const dump = {};
  for (const [name, model] of Object.entries(models)) {
    try {
      const rows = await model.findAll({ raw: true });
      dump[name] = rows;
    } catch (err) {
      logger.warn(`BackupScheduler: skipped table ${name}: ${err.message}`);
      dump[name] = [];
    }
  }
  const json = JSON.stringify({
    _meta: {
      exported_at: new Date().toISOString(),
      database: process.env.DB_NAME || 'bloods_hub_db',
      table_count: Object.keys(dump).length,
      total_rows: Object.values(dump).reduce((s, r) => s + r.length, 0),
    },
    tables: dump,
  });
  const compressed = zlib.gzipSync(json);
  fs.writeFileSync(filepath, compressed);
}

function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const dbName = process.env.DB_NAME || 'bloods_hub_db';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const useMysqldump = hasMysqldump();
  const ext = useMysqldump ? 'sql.gz' : 'json.gz';
  const filename = `backup_${dbName}_${timestamp}.${ext}`;
  const filepath = path.join(BACKUP_DIR, filename);

  if (useMysqldump) {
    try {
      backupWithMysqldump(filepath);
      const size = fs.statSync(filepath).size;
      logger.info(`BackupScheduler: backup created ${filename} (${(size / 1024 / 1024).toFixed(2)} MB) [mysqldump]`);
      cleanOld();
    } catch (err) {
      logger.error(`BackupScheduler: mysqldump failed, trying Sequelize fallback: ${err.message}`);
      // Fall through to Sequelize backup
      runSequelizeBackup(filepath, filename);
    }
  } else {
    runSequelizeBackup(filepath, filename);
  }
}

function runSequelizeBackup(filepath, filename) {
  backupWithSequelize(filepath)
    .then(() => {
      const size = fs.statSync(filepath).size;
      logger.info(`BackupScheduler: backup created ${filename} (${(size / 1024 / 1024).toFixed(2)} MB) [sequelize]`);
      cleanOld();
    })
    .catch((err) => {
      logger.error(`BackupScheduler: backup failed: ${err.message}`);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    });
}

function cleanOld() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup_') && (f.endsWith('.sql.gz') || f.endsWith('.json.gz')))
    .map((f) => ({ name: f, path: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  const toDelete = files.slice(MAX_BACKUPS);
  for (const f of toDelete) {
    fs.unlinkSync(f.path);
    logger.info(`BackupScheduler: removed old backup ${f.name}`);
  }
}

function start() {
  // Check every minute if it's 4:00 AM
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
