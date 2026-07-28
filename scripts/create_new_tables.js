// scripts/create_new_tables.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

async function main() {
  const s = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: '127.0.0.1', dialect: 'mysql', logging: false,
  });

  await s.query(`CREATE TABLE IF NOT EXISTS user_badges (
    user_id BIGINT UNSIGNED NOT NULL,
    guild_id BIGINT UNSIGNED NOT NULL,
    badge_code VARCHAR(32) NOT NULL,
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, guild_id, badge_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await s.query(`CREATE TABLE IF NOT EXISTS warnings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    guild_id BIGINT UNSIGNED NOT NULL,
    issued_by BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(500) NOT NULL,
    severity ENUM('low','medium','high') NOT NULL DEFAULT 'low',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id, guild_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await s.query(`CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guild_id BIGINT UNSIGNED NOT NULL,
    game_id SMALLINT UNSIGNED NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT UNSIGNED NOT NULL DEFAULT 60,
    created_by BIGINT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild_active (guild_id, is_active, scheduled_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await s.query(`CREATE TABLE IF NOT EXISTS event_participants (
    event_id INT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    guild_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    INDEX idx_user (user_id, guild_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  console.log('All new tables created (user_badges, warnings, events, event_participants)');
  await s.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
