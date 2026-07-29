// src/scripts/seed.js
// Seeds the database with default games + optional test data for development.
// Usage:
//   npm run seed            — seed games only (safe for production)
//   npm run seed -- --full  — seed games + test users, warnings, suggestions, etc.
const { sequelize, Game, User, Warning, Suggestion, Poll, Tag, ActivityLog } = require('../db');
const logger = require('../utils/logger');

const GUILD_ID = process.env.GUILD_ID || '1010226759817515018';

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

// Test data for development — only inserted with --full flag
const testUsers = [
  { user_id: '100000000000000001', guild_id: GUILD_ID, username: 'TestUser1', level: 15, xp: 22500, total_messages: 500, total_voice_seconds: 36000 },
  { user_id: '100000000000000002', guild_id: GUILD_ID, username: 'TestUser2', level: 8, xp: 6400, total_messages: 200, total_voice_seconds: 18000 },
  { user_id: '100000000000000003', guild_id: GUILD_ID, username: 'TestUser3', level: 25, xp: 62500, total_messages: 1200, total_voice_seconds: 72000 },
  { user_id: '100000000000000004', guild_id: GUILD_ID, username: 'TestUser4', level: 3, xp: 900, total_messages: 50, total_voice_seconds: 3600 },
  { user_id: '100000000000000005', guild_id: GUILD_ID, username: 'TestUser5', level: 50, xp: 250000, total_messages: 5000, total_voice_seconds: 180000 },
];

const testWarnings = [
  { guild_id: GUILD_ID, user_id: '100000000000000001', moderator_id: '100000000000000005', reason: 'Linguaggio non appropriato', severity: 'medium', points: 3 },
  { guild_id: GUILD_ID, user_id: '100000000000000002', moderator_id: '100000000000000005', reason: 'Spam in chat', severity: 'low', points: 1 },
];

const testSuggestions = [
  { guild_id: GUILD_ID, user_id: '100000000000000001', content: 'Aggiungere un canale musicale', status: 'open', upvotes: 5, downvotes: 1 },
  { guild_id: GUILD_ID, user_id: '100000000000000003', content: 'Organizzare un torneo di Valorant', status: 'approved', upvotes: 12, downvotes: 0 },
];

const testPolls = [
  { guild_id: GUILD_ID, user_id: '100000000000000005', question: 'Quale giorno per il game night?', options: JSON.stringify(['Venerdì', 'Sabato', 'Domenica']), is_closed: false },
];

const testTags = [
  { guild_id: GUILD_ID, name: 'regole', content: 'Leggi il regolamento del server!', category: 'info', created_by: '100000000000000005' },
  { guild_id: GUILD_ID, name: 'benvenuto', content: 'Benvenuto nel server! Usa /verify per verificarti.', category: 'info', created_by: '100000000000000005' },
];

async function seedGamesCatalog() {
  for (const g of seedGames) {
    await Game.findOrCreate({ where: { code: g.code }, defaults: g });
  }
  logger.info(`Seeded ${seedGames.length} games.`);
}

async function seedTestData() {
  logger.info('Seeding test data...');

  // Users
  for (const u of testUsers) {
    await User.findOrCreate({ where: { user_id: u.user_id, guild_id: u.guild_id }, defaults: u });
  }
  logger.info(`Seeded ${testUsers.length} test users.`);

  // Warnings
  for (const w of testWarnings) {
    await Warning.findOrCreate({ where: { guild_id: w.guild_id, user_id: w.user_id, reason: w.reason }, defaults: w });
  }
  logger.info(`Seeded ${testWarnings.length} test warnings.`);

  // Suggestions
  for (const s of testSuggestions) {
    await Suggestion.findOrCreate({ where: { guild_id: s.guild_id, user_id: s.user_id, content: s.content }, defaults: s });
  }
  logger.info(`Seeded ${testSuggestions.length} test suggestions.`);

  // Polls
  for (const p of testPolls) {
    await Poll.findOrCreate({ where: { guild_id: p.guild_id, question: p.question }, defaults: p });
  }
  logger.info(`Seeded ${testPolls.length} test polls.`);

  // Tags
  for (const t of testTags) {
    await Tag.findOrCreate({ where: { guild_id: t.guild_id, name: t.name }, defaults: t });
  }
  logger.info(`Seeded ${testTags.length} test tags.`);

  // Activity log entries
  for (let i = 0; i < 20; i++) {
    await ActivityLog.create({
      guild_id: GUILD_ID,
      user_id: testUsers[i % testUsers.length].user_id,
      event_type: ['message_sent', 'voice_join', 'command_used', 'level_up'][i % 4],
      xp_gained: Math.floor(Math.random() * 50),
      occurred_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }
  logger.info('Seeded 20 activity log entries.');
}

async function run() {
  const fullMode = process.argv.includes('--full');

  await seedGamesCatalog();

  if (fullMode) {
    await seedTestData();
    logger.info('Full seed completed. WARNING: test data inserted — do NOT use in production!');
  } else {
    logger.info('Games-only seed completed. Use --full for test data.');
  }

  await sequelize.close();
}

run().catch((e) => {
  logger.error('Seed error:', e);
  process.exit(1);
});
