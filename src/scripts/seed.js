// src/scripts/seed.js
// Inserts the default games catalog (idempotent via INSERT IGNORE).
const { sequelize, Game } = require('../db');
const logger = require('../utils/logger');

const seedGames = [
  { code: 'wow',       name: 'World of Warcraft', category: 'mmo',     api_provider: 'battlenet', color_hex: 0xcd853f },
  { code: 'valorant',  name: 'Valorant',          category: 'fps',     api_provider: 'riot',      color_hex: 0xff4655 },
  { code: 'lol',       name: 'League of Legends', category: 'moba',    api_provider: 'riot',      color_hex: 0x0bc6e3 },
  { code: 'csgo',      name: 'Counter-Strike 2',  category: 'fps',     api_provider: 'steam',     color_hex: 0xf5a623 },
  { code: 'dota2',     name: 'Dota 2',            category: 'moba',    api_provider: 'steam',     color_hex: 0xa8324a },
  { code: 'apex',      name: 'Apex Legends',      category: 'fps',     api_provider: 'manual',    color_hex: 0xda292a },
  { code: 'minecraft', name: 'Minecraft',         category: 'sandbox', api_provider: 'manual',    color_hex: 0x44a847 },
  { code: 'ffxiv',     name: 'Final Fantasy XIV', category: 'mmo',     api_provider: 'manual',    color_hex: 0x4a90d9 },
];

async function run() {
  for (const g of seedGames) {
    await Game.findOrCreate({ where: { code: g.code }, defaults: g });
  }
  logger.info(`Seeded ${seedGames.length} games.`);
  await sequelize.close();
}

run().catch((e) => {
  logger.error('Seed error:', e);
  process.exit(1);
});
