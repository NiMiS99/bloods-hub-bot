// scripts/test_role_selection.js
// Simulates selecting games via role selection and verifies channel access.
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Game, User } = require('../src/db');

const GUILD_ID = '1010226759817515018';
const TEST_USER_ID = '1466916802230747361'; // Test user

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.fetch();
    await guild.members.fetch();
    await guild.roles.fetch();
    await guild.channels.fetch();

    const member = await guild.members.fetch(TEST_USER_ID);
    if (!member) {
      console.log('Test user not found');
      process.exit(1);
    }

    console.log(`=== TEST: Role Selection for ${member.user.username} ===\n`);

    // 1. Current game roles
    const games = await Game.findAll({ where: { is_active: true } });
    console.log('Current game roles:');
    for (const g of games) {
      const has = g.role_id && member.roles.cache.has(g.role_id);
      console.log(`  ${has ? '✓' : '✗'} ${g.name} (role: ${g.role_id ? 'configured' : 'NOT SET'})`);
    }

    // 2. Test: assign Valorant + LoL roles to the user
    console.log('\n--- Assigning Valorant + LoL roles ---');
    const testGames = ['valorant', 'lol'];
    for (const code of testGames) {
      const game = games.find((g) => g.code === code);
      if (!game || !game.role_id) {
        console.log(`  ✗ ${code}: no role configured`);
        continue;
      }
      const role = guild.roles.cache.get(game.role_id);
      if (!role) {
        console.log(`  ✗ ${code}: role not found in guild`);
        continue;
      }
      if (member.roles.cache.has(role.id)) {
        console.log(`  - ${game.name}: already has role`);
      } else {
        await member.roles.add(role, 'Test: game selection');
        console.log(`  ✓ ${game.name}: role assigned`);
      }
    }

    // 3. Verify channel access for assigned games
    console.log('\n--- Channel Access Verification ---');
    for (const code of testGames) {
      const game = games.find((g) => g.code === code);
      if (!game || !game.category_id) continue;

      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) continue;

      console.log(`\n  [${game.name}] Category: "${cat.name}"`);
      const children = [...guild.channels.cache.values()]
        .filter((c) => c.parentId === cat.id)
        .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

      for (const ch of children) {
        const canView = ch.permissionsFor(member)?.has(PermissionsBitField.Flags.ViewChannel);
        const canSend = ch.permissionsFor(member)?.has(PermissionsBitField.Flags.SendMessages);
        const canRead = ch.permissionsFor(member)?.has(PermissionsBitField.Flags.ReadMessageHistory);
        const typeStr = ch.type === 2 ? 'VC' : 'TXT';
        const access = `${canView ? 'V' : '-'}${canSend ? 'W' : '-'}${canRead ? 'R' : '-'}`;
        console.log(`    [${typeStr}] [${access}] ${ch.name}`);
      }
    }

    // 4. Verify channels for a game NOT selected (should NOT have access)
    console.log('\n--- Non-selected game access (should be denied) ---');
    const notSelected = games.find((g) => !testGames.includes(g.code) && g.category_id);
    if (notSelected) {
      const cat = guild.channels.cache.get(notSelected.category_id);
      if (cat) {
        const firstText = [...guild.channels.cache.values()].find(
          (c) => c.parentId === cat.id && c.type === 0
        );
        if (firstText) {
          const canView = firstText.permissionsFor(member)?.has(PermissionsBitField.Flags.ViewChannel);
          console.log(`  ${notSelected.name} #${firstText.name}: ${canView ? '⚠ CAN VIEW (should be denied!)' : '✓ Cannot view (correct)'}`);
        }
      }
    }

    // 5. Check news channel content for assigned games
    console.log('\n--- News Channel Content Check ---');
    for (const code of testGames) {
      const game = games.find((g) => g.code === code);
      if (!game || !game.category_id) continue;

      const cat = guild.channels.cache.get(game.category_id);
      const newsCh = [...guild.channels.cache.values()].find(
        (c) => c.parentId === cat.id && c.name.includes('📰')
      );
      if (newsCh) {
        try {
          const messages = await newsCh.messages.fetch({ limit: 5 });
          console.log(`  ${game.name} #${newsCh.name}: ${messages.size} messages`);
          for (const m of messages.values()) {
            console.log(`    [${m.createdAt.toISOString().split('T')[0]}] ${m.author.username}: ${m.content.substring(0, 60) || '[embed]'}`);
          }
        } catch (e) {
          console.log(`  ${game.name}: cannot fetch messages (${e.message.substring(0, 50)})`);
        }
      }
    }

    // 6. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`  User: ${member.user.username}`);
    console.log(`  Game roles: ${member.roles.cache.filter((r) => games.some((g) => g.role_id === r.id)).map((r) => r.name).join(', ') || 'none'}`);
    const communityRole = guild.roles.cache.find((r) => r.name === 'Membro della community');
    console.log(`  Community role: ${communityRole && member.roles.cache.has(communityRole.id) ? '✓ has' : '✗ missing'}`);

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
