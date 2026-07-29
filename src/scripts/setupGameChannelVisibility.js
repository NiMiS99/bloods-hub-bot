// src/scripts/setupGameChannelVisibility.js
// Hides game categories from @everyone — only visible with the game role.
// Run once to apply permissions, then the role panel auto-manages access.
const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';

// Map: category ID → role name (Fraktur names can't be matched by string)
const GAME_CATEGORY_MAP = {
  '1529823034603601941': 'Apex Legends',        // 𝖠𝗉𝖾𝗑 𝖫𝖾𝗀𝖾𝗇𝖽𝗌
  '1529619883036246049': 'Counter-Strike 2',     // 𝖢𝗈𝗎𝗇𝗍𝖾𝗋-𝖲𝗍𝗋𝗂𝗄𝖾 2
  '1529619887687729202': 'Dota 2',              // 𝖣𝗈𝗍𝖺 2
  '1529823048734347355': 'Final Fantasy XIV',   // 𝖥𝗂𝗇𝖺𝗅 𝖥𝖺𝗇𝗍𝖺𝗌𝗒 𝖷𝖨𝖵
  '1529619869279195157': 'League of Legends',   // 𝖫𝖾𝖺𝗀𝗎𝖾 𝗈𝖿 𝖫𝖾𝗀𝖾𝗇𝖽𝗌
  '1529823043944317029': 'Minecraft',           // 𝖬𝗂𝗇𝖾𝖼𝗋𝖺𝖿𝗍
  '1529619865319772313': 'Valorant',            // 𝖵𝖺𝗅𝗈𝗋𝖺𝗇𝗍
  '1530547350307868863': 'World of Warcraft',   // 𝖶𝗈𝗋𝗅𝖽 𝗈𝖿 𝖶𝖺𝗋𝖼𝗋𝖺𝖿𝗍
};

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.discord.token);
  await new Promise((r) => client.once('ready', r));

  const guild = client.guilds.cache.get(GUILD_ID);
  await guild.channels.fetch();
  await guild.roles.fetch();

  const everyone = guild.roles.everyone;
  let count = 0;

  for (const [catId, roleName] of Object.entries(GAME_CATEGORY_MAP)) {
    const category = guild.channels.cache.get(catId);
    if (!category || category.type !== ChannelType.GuildCategory) {
      console.log(`SKIP: category ID "${catId}" not found`);
      continue;
    }

    const role = [...guild.roles.cache.values()].find((r) => r.name === roleName);
    if (!role) {
      console.log(`SKIP: role "${roleName}" not found`);
      continue;
    }

    // Deny @everyone from viewing the category
    await category.permissionOverwrites.edit(everyone.id, {
      ViewChannel: false,
    });

    // Allow the game role to view and interact
    await category.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      Connect: true,
      Speak: true,
      UseVAD: true,
      AddReactions: true,
      AttachFiles: true,
      EmbedLinks: true,
      UseApplicationCommands: true,
    });

    // Allow Bloods and staff to see all game channels
    for (const staffRole of ['Bloods', 'Membro della community', 'Bloods Admin', 'Consigliere', 'Founder', 'Owner', 'Officer', 'Bot']) {
      const sr = [...guild.roles.cache.values()].find((r) => r.name === staffRole);
      if (sr) {
        await category.permissionOverwrites.edit(sr.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});
      }
    }

    console.log(`OK: ${roleName} → hidden from @everyone, visible with role`);
    count++;
  }

  console.log(`\nDone! ${count} game categories configured.`);
  await client.destroy();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
