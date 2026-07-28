// scripts/audit_permissions.js
// Full permission audit: for each game category, list all channels and their
// permission overrides. Also simulates what a non-admin member with the game
// role would see.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const { Sequelize } = require('sequelize');

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(process.env.DISCORD_TOKEN);
  const guild = await client.guilds.fetch(process.env.GUILD_ID, { force: true });
  await guild.channels.fetch();
  await guild.roles.fetch();
  await guild.members.fetch();

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'bloods_hub_db',
    process.env.DB_USER || 'nimis99',
    process.env.DB_PASSWORD || '',
    { host: '127.0.0.1', dialect: 'mysql', logging: false }
  );
  const [games] = await sequelize.query(
    "SELECT id, code, name, role_id, category_id FROM games WHERE code != 'wow' AND is_active = 1 AND category_id IS NOT NULL"
  );

  const everyone = guild.roles.everyone;
  const botId = client.user.id;

  // Find a non-admin member to simulate visibility.
  const testMember = [...guild.members.cache.values()].find(
    (m) => !m.user.bot && !m.permissions.has(PermissionsBitField.Flags.Administrator)
  );
  console.log(`\nSimulating with non-admin member: ${testMember.user.tag}\n`);

  for (const g of games) {
    const role = guild.roles.cache.get(g.role_id);
    const cat = guild.channels.cache.get(g.category_id);
    if (!role || !cat) {
      console.log(`SKIP ${g.name}: role or category missing`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`${g.name} (code=${g.code})`);
    console.log(`  Role: @${role.name} (${role.id})`);
    console.log(`  Category: ${cat.name} (${cat.id})`);
    console.log(`${'='.repeat(60)}`);

    // Category overrides
    console.log('\n  Category overrides:');
    for (const [id, ow] of cat.permissionOverwrites.cache) {
      const name = id === everyone.id ? '@everyone' : id === botId ? 'BOT' : (guild.roles.cache.get(id)?.name || id);
      const allow = ow.allow.toArray();
      const deny = ow.deny.toArray();
      console.log(`    ${name}: allow=[${allow.join(',')}] deny=[${deny.join(',')}]`);
    }

    // Compute permissions manually for a member with only @everyone + game role.
    function computePerm(channel, roleId) {
      const everyoneOW = channel.permissionOverwrites.cache.get(everyone.id);
      const roleOW = channel.permissionOverwrites.cache.get(roleId);
      // Start: @everyone deny ViewChannel = hidden by default
      let view = !(everyoneOW?.deny.has(PermissionsBitField.Flags.ViewChannel));
      let send = !(everyoneOW?.deny.has(PermissionsBitField.Flags.SendMessages));
      let connect = !(everyoneOW?.deny.has(PermissionsBitField.Flags.Connect));
      // Apply role overrides
      if (roleOW) {
        if (roleOW.allow.has(PermissionsBitField.Flags.ViewChannel)) view = true;
        if (roleOW.deny.has(PermissionsBitField.Flags.ViewChannel)) view = false;
        if (roleOW.allow.has(PermissionsBitField.Flags.SendMessages)) send = true;
        if (roleOW.deny.has(PermissionsBitField.Flags.SendMessages)) send = false;
        if (roleOW.allow.has(PermissionsBitField.Flags.Connect)) connect = true;
        if (roleOW.deny.has(PermissionsBitField.Flags.Connect)) connect = false;
      }
      return { view, send, connect };
    }

    const catPerm = computePerm(cat, role.id);
    console.log(`  → Member with @${role.name}: visible=${catPerm.view}, canSend=${catPerm.send}, canConnect=${catPerm.connect}`);

    // Child channels
    const children = [...guild.channels.cache.values()]
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => (a.type === ChannelType.GuildText ? -1 : 1) - (b.type === ChannelType.GuildText ? -1 : 1));

    console.log(`\n  Channels (${children.length}):`);
    for (const ch of children) {
      const typeName = ch.type === ChannelType.GuildText ? 'TEXT' : ch.type === ChannelType.GuildVoice ? 'VOICE' : 'OTHER';
      console.log(`\n    [${typeName}] ${ch.name} (${ch.id})`);

      for (const [id, ow] of ch.permissionOverwrites.cache) {
        const name = id === everyone.id ? '@everyone' : id === botId ? 'BOT' : (guild.roles.cache.get(id)?.name || id);
        const allow = ow.allow.toArray();
        const deny = ow.deny.toArray();
        console.log(`      ${name}: allow=[${allow.join(',')}] deny=[${deny.join(',')}]`);
      }

      const chPerm = computePerm(ch, role.id);
      console.log(`      → visible=${chPerm.view}, canSend=${chPerm.send}, canConnect=${chPerm.connect}`);
    }
  }

  await sequelize.close();
  await client.destroy();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
