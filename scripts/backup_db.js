// scripts/backup_db.js
// MySQL database backup script — uses mysqldump to create a timestamped backup.
// Run with: npm run backup
// Keeps the last 30 backups, deletes older ones.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  name: process.env.DB_NAME || 'bloods_hub_db',
};

function backup() {
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${dbConfig.name}_${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`Backup: ${dbConfig.name} -> ${filename}`);

  // Build mysqldump command
  // Note: --password= on command line is insecure but mysqldump doesn't support
  // reading password from env directly. Use MYSQL_PWD env var instead.
  const env = { ...process.env, MYSQL_PWD: dbConfig.password };
  const cmd = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.user} --single-transaction --routines --triggers --events ${dbConfig.name}`;

  try {
    execSync(`${cmd} > "${filepath}"`, { env, stdio: 'pipe' });
    const size = fs.statSync(filepath).size;
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    console.log(`OK: ${filename} (${sizeMB} MB)`);

    // Compress with gzip if available
    try {
      execSync(`gzip "${filepath}"`, { stdio: 'pipe' });
      const compressedSize = fs.statSync(filepath + '.gz').size;
      const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);
      console.log(`Compressed: ${filename}.gz (${compressedMB} MB)`);
      fs.unlinkSync(filepath);
    } catch {
      // gzip not available, keep uncompressed
    }

    // Clean old backups
    cleanOldBackups();

    console.log('Backup completato con successo.');
  } catch (err) {
    console.error('ERRORE backup:', err.message);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    process.exit(1);
  }
}

function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
    .map((f) => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length <= MAX_BACKUPS) return;

  const toDelete = files.slice(MAX_BACKUPS);
  for (const f of toDelete) {
    fs.unlinkSync(f.path);
    console.log(`Rimosso backup vecchio: ${f.name}`);
  }
}

backup();
