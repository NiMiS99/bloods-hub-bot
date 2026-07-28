// scripts/check_consistency.js
// Check DB game records vs actual Discord channels/roles.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits } = require('discord.js');
const { Sequelize } = require('sequelize');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID, { force: true });
  await guild.channels.fetch();
  await guild.roles.fetch();

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'bloods_hub_db',
    process.env.DB_USER || 'nimis99',
    process.env.DB_PASSWORD || '',
    { host: '127.0.0.1', dialect: 'mysql', logging: false }
  );

  const [games] = await sequelize.query(
    "SELECT id, code, name, role_id, category_id FROM games WHERE code != 'wow'"
  );

  console.log('=== DB vs DISCORD CONSISTENCY CHECK ===\n');
  const orphans = [];
  for (const g of games) {
    const role = guild.roles.cache.get(g.role_id);
    const cat = g.category_id ? guild.channels.cache.get(g.category_id) : null;
    let children = [];
    if (cat) {
      children = [...guild.channels.cache.values()].filter(c => c.parentId === cat.id);
    }
    const roleOK = !!role;
    const catOK = !!cat;
    console.log(`${g.name} (code=${g.code})`);
    console.log(`  Role:    ${role ? '@' + role.name + ' (' + role.id + ')' : 'MISSING (db id=' + g.role_id + ')'}`);
    console.log(`  Category:${cat ? ' ' + cat.name + ' (' + cat.id + ')' : ' MISSING (db id=' + g.category_id + ')'}`);
    console.log(`  Channels:${children.length > 0 ? ' ' + children.map(c => c.name).join(', ') : ' NONE'}`);
    if (!roleOK || !catOK) {
      orphans.push({ id: g.id, code: g.code, name: g.name, roleOK, catOK, role_id: g.role_id, category_id: g.category_id });
    }
    console.log('');
  }

  if (orphans.length > 0) {
    console.log('=== ORPHANED GAMES (need rebuild) ===');
    orphans.forEach(o => {
      console.log(`  ${o.name} (${o.code}): role=${o.roleOK ? 'ok' : 'MISSING'} category=${o.catOK ? 'ok' : 'MISSING'}`);
    });
  } else {
    console.log('=== ALL GAMES CONSISTENT ===');
  }

  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
