// scripts/audit_roles.js
// Full audit of all roles: position, permissions, color, who can see what.
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { Game } = require('../src/db');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const GUILD_ID = '1010226759817515018';

// All permission flags for display
const ALL_PERMS = [
  ['Administrator', PermissionsBitField.Flags.Administrator],
  ['ManageGuild', PermissionsBitField.Flags.ManageGuild],
  ['ManageRoles', PermissionsBitField.Flags.ManageRoles],
  ['ManageChannels', PermissionsBitField.Flags.ManageChannels],
  ['ManageMessages', PermissionsBitField.Flags.ManageMessages],
  ['ManageThreads', PermissionsBitField.Flags.ManageThreads],
  ['KickMembers', PermissionsBitField.Flags.KickMembers],
  ['BanMembers', PermissionsBitField.Flags.BanMembers],
  ['ModerateMembers', PermissionsBitField.Flags.ModerateMembers],
  ['ManageNicknames', PermissionsBitField.Flags.ManageNicknames],
  ['ManageEmojis', PermissionsBitField.Flags.ManageEmojis],
  ['ManageWebhooks', PermissionsBitField.Flags.ManageWebhooks],
  ['ManageEvents', PermissionsBitField.Flags.ManageEvents],
  ['ViewAuditLog', PermissionsBitField.Flags.ViewAuditLog],
  ['ViewGuildInsights', PermissionsBitField.Flags.ViewGuildInsights],
  ['SendMessages', PermissionsBitField.Flags.SendMessages],
  ['SendMessagesInThreads', PermissionsBitField.Flags.SendMessagesInThreads],
  ['EmbedLinks', PermissionsBitField.Flags.EmbedLinks],
  ['AttachFiles', PermissionsBitField.Flags.AttachFiles],
  ['AddReactions', PermissionsBitField.Flags.AddReactions],
  ['UseExternalEmojis', PermissionsBitField.Flags.UseExternalEmojis],
  ['UseExternalStickers', PermissionsBitField.Flags.UseExternalStickers],
  ['MentionEveryone', PermissionsBitField.Flags.MentionEveryone],
  ['ReadMessageHistory', PermissionsBitField.Flags.ReadMessageHistory],
  ['UseApplicationCommands', PermissionsBitField.Flags.UseApplicationCommands],
  ['Connect', PermissionsBitField.Flags.Connect],
  ['Speak', PermissionsBitField.Flags.Speak],
  ['Stream', PermissionsBitField.Flags.Stream],
  ['UseVAD', PermissionsBitField.Flags.UseVAD],
  ['PrioritySpeaker', PermissionsBitField.Flags.PrioritySpeaker],
  ['MuteMembers', PermissionsBitField.Flags.MuteMembers],
  ['DeafenMembers', PermissionsBitField.Flags.DeafenMembers],
  ['MoveMembers', PermissionsBitField.Flags.MoveMembers],
  ['RequestToSpeak', PermissionsBitField.Flags.RequestToSpeak],
  ['ChangeNickname', PermissionsBitField.Flags.ChangeNickname],
  ['CreateInstantInvite', PermissionsBitField.Flags.CreateInstantInvite],
  ['ViewChannel', PermissionsBitField.Flags.ViewChannel],
  ['UseSoundboard', PermissionsBitField.Flags.UseSoundboard],
  ['UseExternalSounds', PermissionsBitField.Flags.UseExternalSounds],
  ['UseEmbeddedActivities', PermissionsBitField.Flags.UseEmbeddedActivities],
].filter(([name, flag]) => flag !== undefined);

client.once('ready', async () => {
  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.fetch();
  await guild.roles.fetch();
  await guild.channels.fetch();
  await guild.members.fetch({ withPresences: false });

  const botMember = await guild.members.fetch(client.user.id);
  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

  console.log('=== ROLES AUDIT ===\n');
  console.log(`Total roles: ${roles.length}`);
  console.log(`Bot highest role position: ${botMember.roles.highest.position}\n`);

  // 1. Role list with permissions
  console.log('--- ROLE HIERARCHY ---\n');
  for (const role of roles) {
    if (role.id === guild.roles.everyone.id) {
      console.log(`pos ${role.position}: @everyone (id:${role.id})`);
      console.log(`  members: ALL (${guild.memberCount})`);
      console.log(`  color: none`);
      console.log(`  hoist: false`);
      console.log(`  mentionable: false`);
      const perms = role.permissions;
      const permList = ALL_PERMS.filter(([name, flag]) => perms.has(flag)).map(([name]) => name);
      console.log(`  permissions (${permList.length}): ${permList.join(', ') || 'none'}`);
      console.log('');
      continue;
    }

    const perms = role.permissions;
    const permList = ALL_PERMS.filter(([name, flag]) => perms.has(flag)).map(([name]) => name);
    const isManaged = role.managed;
    const isBot = isManaged && role.tags?.botId;
    const isBoost = isManaged && role.tags?.premiumSubscriberRole;

    console.log(`pos ${role.position}: "${role.name}" (id:${role.id})`);
    console.log(`  members: ${role.members.size}`);
    console.log(`  color: ${role.color ? '#' + role.color.toString(16).padStart(6, '0') : 'none'}`);
    console.log(`  hoist: ${role.hoist}, mentionable: ${role.mentionable}`);
    console.log(`  type: ${isBot ? 'BOT' : isBoost ? 'BOOST' : isManaged ? 'MANAGED' : 'CUSTOM'}`);
    if (isBot) console.log(`  bot: ${role.tags.botId}`);
    console.log(`  permissions (${permList.length}): ${permList.join(', ') || 'none'}`);

    // Check if above bot
    if (role.position >= botMember.roles.highest.position && !isManaged) {
      console.log(`  ⚠ ABOVE BOT — bot cannot manage this role`);
    }
    console.log('');
  }

  // 2. Category visibility per role
  console.log('\n--- CATEGORY VISIBILITY MATRIX ---\n');
  const games = await Game.findAll({ where: { is_active: true } });
  const gameCatIds = new Set(games.map((g) => g.category_id).filter(Boolean));

  const categories = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));

  const keyRoles = roles.filter((r) => !r.managed && r.id !== guild.roles.everyone.id);
  // Also include @everyone
  const allKeyRoles = [guild.roles.everyone, ...keyRoles];

  // Print header
  const roleNames = allKeyRoles.map((r) => r.name.substring(0, 12).padEnd(12));
  console.log('Category'.padEnd(35) + roleNames.join(' '));
  console.log('-'.repeat(35 + roleNames.length * 13));

  for (const cat of categories) {
    const catName = cat.name.substring(0, 33).padEnd(35);
    const visibility = allKeyRoles.map((role) => {
      const ow = cat.permissionOverwrites?.cache.get(role.id);
      if (!ow) return '— '.padEnd(12); // inherit
      const canView = ow.allow.has(PermissionsBitField.Flags.ViewChannel);
      const denied = ow.deny.has(PermissionsBitField.Flags.ViewChannel);
      if (canView) return '✓ '.padEnd(12);
      if (denied) return '✗ '.padEnd(12);
      return '— '.padEnd(12);
    });
    const isGame = gameCatIds.has(cat.id);
    console.log(catName + visibility.join('') + (isGame ? ' [GAME]' : ''));
  }

  // 3. Bot-managed roles check
  console.log('\n--- BOT-MANAGED ROLES ---\n');
  const botRoles = roles.filter((r) => r.managed && r.tags?.botId === client.user.id);
  for (const role of botRoles) {
    console.log(`  "${role.name}" (id:${role.id}, pos:${role.position})`);
  }
  if (botRoles.length === 0) console.log('  (none)');

  // 4. Check auto-role config
  console.log('\n--- AUTO-ROLE CONFIG ---\n');
  const { Guild } = require('../src/db');
  const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
  if (guildRow?.auto_role_id) {
    const autoRole = guild.roles.cache.get(guildRow.auto_role_id);
    console.log(`  auto_role_id: ${autoRole ? `"${autoRole.name}" (pos:${autoRole.position})` : 'NOT FOUND'}`);
  } else {
    console.log('  auto_role_id: NOT SET');
  }

  // 5. Check which roles are game roles
  console.log('\n--- GAME ROLES ---\n');
  for (const game of games) {
    const role = game.role_id ? guild.roles.cache.get(game.role_id) : null;
    console.log(`  ${game.name}: ${role ? `"${role.name}" (pos:${role.position}, members:${role.members.size})` : 'NOT SET'}`);
  }

  // 6. Check reward roles
  console.log('\n--- LEVEL REWARD ROLES ---\n');
  const { LevelReward } = require('../src/db');
  const rewards = await LevelReward.findAll({ where: { guild_id: GUILD_ID } });
  for (const r of rewards) {
    const role = guild.roles.cache.get(r.role_id);
    console.log(`  Level ${r.level}: ${role ? `"${role.name}" (pos:${role.position})` : 'NOT FOUND'}`);
  }

  process.exit(0);
});

client.login(config.discord.token);
