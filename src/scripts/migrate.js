// src/scripts/migrate.js
// Lightweight migration runner: executes *.sql files in ./db in order.
// Idempotent — uses CREATE TABLE IF NOT EXISTS / INSERT IGNORE in seed files.
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../db');
const logger = require('../utils/logger');

async function run() {
  const dir = path.join(__dirname, '..', '..', 'db');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    logger.info(`Running migration: ${file} (${statements.length} statements)`);
    for (const stmt of statements) {
      try {
        await sequelize.query(stmt + ';');
      } catch (err) {
        logger.error(`Statement failed in ${file}:`, err.message);
      }
    }
  }
  logger.info('Migrations complete.');
  await sequelize.close();
}

run().catch((e) => {
  logger.error('Migration error:', e);
  process.exit(1);
});
