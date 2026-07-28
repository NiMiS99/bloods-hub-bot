// scripts/migrate_bp_data.js
// 1. Sync new BP/WoW tables
// 2. Migrate items.json into bp_items table
const fs = require('fs');
const path = require('path');
const { sequelize, BpItem, BpUser, BpLootHistory, BpActiveRoll, BpRaidRoster, WowEvent, WowEventSignup } = require('../src/db');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected.');

    // Sync new tables only
    await BpUser.sync({ alter: false });
    console.log('✓ bp_users');
    await BpLootHistory.sync({ alter: false });
    console.log('✓ bp_loot_history');
    await BpActiveRoll.sync({ alter: false });
    console.log('✓ bp_active_roll');
    await BpRaidRoster.sync({ alter: false });
    console.log('✓ bp_raid_roster');
    await BpItem.sync({ alter: false });
    console.log('✓ bp_items');
    await WowEvent.sync({ alter: false });
    console.log('✓ wow_events');
    await WowEventSignup.sync({ alter: false });
    console.log('✓ wow_event_signups');

    // Migrate items.json
    const itemsPath = path.join(__dirname, '..', 'items.json');
    const oldItemsPath = 'C:\\Users\\Administrator\\Desktop\\Bloods bot-main\\src\\items.json';

    let itemsRaw;
    if (fs.existsSync(itemsPath)) {
      itemsRaw = fs.readFileSync(itemsPath, 'utf8');
    } else if (fs.existsSync(oldItemsPath)) {
      itemsRaw = fs.readFileSync(oldItemsPath, 'utf8');
      // Copy to project for reference
      fs.copyFileSync(oldItemsPath, itemsPath);
      console.log('✓ Copied items.json from old bot');
    } else {
      console.log('No items.json found — skipping item migration.');
      process.exit(0);
    }

    const items = JSON.parse(itemsRaw);
    if (!Array.isArray(items)) {
      console.log('items.json is not an array — skipping.');
      process.exit(0);
    }

    console.log(`Migrating ${items.length} items...`);
    let inserted = 0;
    for (const it of items) {
      if (!it.id) continue;
      await BpItem.upsert({
        id: String(it.id),
        guild_id: null, // global items
        name: it.name || 'Sconosciuto',
        boss: it.boss || null,
        slot: it.slot || null,
        min_bid: Number(it.minBid ?? 0),
        note: it.note || null,
      });
      inserted++;
    }
    console.log(`✓ Migrated ${inserted} items into bp_items`);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
