// scripts/create_admin_role.js
// Creates a "Bloods Admin" Discord role with the permissions needed to
// manage the bot (Manage Roles, Channels, Messages, etc.) but WITHOUT
// the full Administrator permission. The role is positioned just below
// the bot's highest role so the bot can assign/remove it.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const ADMIN_ROLE_NAME = 'Bloods Admin';

// Permissions needed to manage the bot's features:
// - ManageRoles: assign/remove game roles
// - ManageChannels: create/edit game categories
// - ManageMessages: purge, pin announcements
// - SendMessages: post in read-only channels
// - ReadMessageHistory: read all channels
// - ViewChannel: see all channels
// - Connect/Speak: voice channels
// - EmbedLinks: bot embeds
// - MentionAllRoles: mention game roles in announcements
// - ModerateMembers: timeout/mute
// - KickMembers, BanMembers: moderation
// - ManageGuild: /setup, /game commands
const ADMIN_PERMS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ManageMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.MentionEveryone,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.ManageRoles,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ManageGuild,
  PermissionsBitField.Flags.ModerateMembers,
  PermissionsBitField.Flags.KickMembers,
  PermissionsBitField.Flags.BanMembers,
  PermissionsBitField.Flags.ViewAuditLog,
  PermissionsBitField.Flags.AddReactions,
  PermissionsBitField.Flags.UseExternalEmojis,
];

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
  await client.login(process.env.DISCORD_TOKEN);
  console.log(`Connected as ${client.user.tag}`);

  const guild = await client.guilds.fetch(process.env.GUILD_ID, { force: true });
  await guild.roles.fetch();
  await guild.members.fetch();

  // Check if role already exists.
  let role = guild.roles.cache.find((r) => r.name === ADMIN_ROLE_NAME);
  if (role) {
    console.log(`Role "${ADMIN_ROLE_NAME}" already exists (${role.id}). Updating permissions...`);
    await role.setPermissions(ADMIN_PERMS, 'Update bot admin permissions');
    console.log('Permissions updated.');
  } else {
    // Create the role.
    role = await guild.roles.create({
      name: ADMIN_ROLE_NAME,
      permissions: ADMIN_PERMS,
      mentionable: true,
      reason: 'Admin role for Bloods Hub Bot management',
    });
    console.log(`Created role "${ADMIN_ROLE_NAME}" (${role.id})`);
  }

  // Position the role just below the bot's highest role.
  const botMember = guild.members.cache.get(client.user.id);
  const botHighest = botMember.roles.highest;
  if (botHighest.position > role.position) {
    await role.setPosition(botHighest.position - 1).catch((e) => {
      console.log(`Could not reposition role: ${e.message}`);
    });
    console.log(`Positioned "${ADMIN_ROLE_NAME}" just below bot's highest role (${botHighest.name}).`);
  }

  // Save the role ID to .env for the bot to use.
  console.log(`\n✅ Admin role ready: ${ADMIN_ROLE_NAME} (${role.id})`);
  console.log(`Add this to your .env: ADMIN_ROLE_ID=${role.id}`);
  console.log(`\nAssign this role to your admins. They will be able to use all bot admin commands.`);
  console.log(`The role does NOT have Administrator permission — it has only the specific perms the bot needs.`);

  await client.destroy();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
