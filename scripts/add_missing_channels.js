// scripts/add_missing_channels.js
// ============================================================================
//  Creates missing channels on the Bloods Community Discord server.
//  Uses Fraktur naming convention (toFraktur) to match existing style.
//  Sets proper permissions per role.
//
//  Usage:  node -r dotenv/config scripts/add_missing_channels.js
// ============================================================================

const path = require('path');
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const { toFraktur } = require('../src/utils/textFormatter');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('ERROR: DISCORD_TOKEN and GUILD_ID must be set in .env');
  process.exit(1);
}

// ── Role IDs (from extract_categories.js output) ───────────────────────────
const ROLES = {
  everyone: GUILD_ID,                    // @everyone
  bloods: '1013186233993810100',         // Bloods
  community: '1421545567179243550',      // Membro della community
  nonVerificato: '1530605744335093784',  // Non Verificato
  officer: '1012731374777663488',
  officerReclutatore: '1486107215302496327',
  officerProva: '1452409084161691718',
  guidaIncursioni: '1420070512167620628',
  guidaSpedizioni: '1420070587354583222',
  bloodsAdmin: '1529875116039606274',
  consigliere: '1418580069772951654',
  founder: '1461109465528143965',
  owner: '1418580128472240178',
  bot: '1422966848252805151',
};

// Staff role IDs (for staff-only channels)
const STAFF_ROLES = [
  ROLES.owner, ROLES.founder, ROLES.consigliere, ROLES.bloodsAdmin,
  ROLES.officer, ROLES.officerReclutatore, ROLES.officerProva,
  ROLES.guidaIncursioni, ROLES.guidaSpedizioni, ROLES.bot,
];

// ── Category IDs (from extract_categories.js output) ───────────────────────
const CAT = {
  forum: '1530567893366870066',
  areaIniziale: '1530567851839062077',
  gildaPvE: '1530571762532745376',       // 🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖤
  gildaPvP: '1530571764072190022',       // 🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺 𝖯𝗏𝖯
  gildaInfo: '1530573540535832667',      // 🏰 𝖡𝗅𝗈𝗈𝖽𝗌 info
  gilda: '1530567864137027596',          // 🏰 𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺
  community: '1530568100842442854',      // 𝖢𝗈𝗆𝗆𝗎𝗇𝗂𝗍𝗒 𝖧𝗎𝖻
  assistenza: '1421540995828289596',     // 𝖠𝗌𝗌𝗂𝗌𝗍𝖾𝗇𝖟𝖺
  streaming: '1459554999653896242',      // 𝖲𝗍𝗋𝖾𝖺𝗆𝗂𝗇𝗍 𝖹𝗈𝗇𝖾
};

// ── Helper: build permission overwrites ────────────────────────────────────
function denyEveryone() {
  return {
    id: ROLES.everyone,
    deny: [PermissionFlagsBits.ViewChannel],
  };
}

function allowBloods() {
  return {
    id: ROLES.bloods,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.UseExternalEmojis,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.SendMessagesInThreads,
    ],
  };
}

function allowStaff() {
  return {
    id: ROLES.bloodsAdmin, // Admin represents all staff via hierarchy; we add each below
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.MentionEveryone,
    ],
  };
}

function allowStaffFull() {
  return {
    id: ROLES.bloodsAdmin,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ManageChannels,
    ],
  };
}

// ── Channels to create ─────────────────────────────────────────────────────
const CHANNELS_TO_CREATE = [
  // === GILDA PvE (Bloods + Staff) ===
  {
    name: '⚔️丨𝖳𝖺𝗍𝗍𝗂𝖼𝗁𝖾',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvE,
    topic: 'Tattiche boss The Venomous Abyss — video, weakaura, macro, spiegazioni. Thread per boss.',
    overwrites: [denyEveryone(), allowBloods()],
  },
  {
    name: '🏦丨𝖡𝖺𝗇𝖼𝖺-𝖦𝗂𝗅𝖽𝖺',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvE,
    topic: 'Comunicazioni banca gilda, richieste craft, report mensile.',
    overwrites: [denyEveryone(), allowBloods()],
  },
  {
    name: '🎓丨𝖯𝗋𝖾𝗌𝖾𝗇𝗍𝖺𝗓𝗂𝗈𝗇𝗂',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvE,
    topic: 'Nuovi membri si presentano (template fornito).',
    overwrites: [denyEveryone(), allowBloods()],
  },
  {
    name: '❓丨𝖥𝖠𝖰',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvE,
    topic: 'Domande frequenti: orari raid, come iscriversi, come funziona BP, requisiti raider mitico.',
    overwrites: [denyEveryone(), allowBloods()],
  },

  // === GILDA PvP (Bloods + Staff) ===
  {
    name: '🎯丨𝖠𝗋𝖾𝗇𝖺-𝖫𝖥𝖦',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvP,
    topic: 'Lookup partner arena 2v2/3v3.',
    overwrites: [denyEveryone(), allowBloods()],
  },
  {
    name: '📊丨𝖤𝗏𝖾𝗇𝗍𝗂-𝖯𝗏𝖯',
    type: ChannelType.GuildText,
    parent: CAT.gildaPvP,
    topic: 'Tornei interni, eventi PvP, risultati.',
    overwrites: [denyEveryone(), allowBloods()],
  },

  // === FORUM (Staff only) — staff-chat + officer-only ===
  {
    name: '📋丨𝖲𝗍𝖺𝖿𝖿-𝖢𝗁𝖺𝗍',
    type: ChannelType.GuildText,
    parent: CAT.forum,
    topic: 'Discussione staff.',
    overwrites: [denyEveryone(), allowStaffFull()],
  },
  {
    name: '🔒丨𝖮𝖿𝖿𝗂𝖼𝖾𝗋-𝖮𝗇𝗅𝗒',
    type: ChannelType.GuildText,
    parent: CAT.forum,
    topic: 'Solo Officer+.',
    overwrites: [
      denyEveryone(),
      { id: ROLES.officer, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.officerReclutatore, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.officerProva, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.guidaIncursioni, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.guidaSpedizioni, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.bloodsAdmin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.consigliere, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.founder, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      { id: ROLES.owner, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ],
  },
];

// ── New category: MYTHIC+ (Bloods + Staff) ─────────────────────────────────
const NEW_CATEGORY = {
  name: '🗝️ 𝖬𝖸𝖳𝖧𝖨𝖢+',
  type: ChannelType.GuildCategory,
  position: 8, // After GILDA categories, before Community Hub
  overwrites: [
    denyEveryone(),
    allowBloods(),
  ],
};

const NEW_CATEGORY_CHANNELS = [
  {
    name: '🔑丨𝖪𝖾𝗒𝗌-𝖲𝖾𝗍𝗍𝗂𝗆𝖺𝗇𝖺𝗅𝗂',
    type: ChannelType.GuildText,
    topic: 'Post delle key in gilda (bot o manuale). Affix della settimana.',
  },
  {
    name: '🎯丨𝖫𝖥𝖦-𝖬𝗂𝗍𝗈',
    type: ChannelType.GuildText,
    topic: 'Lookup group M+ tra gildani.',
  },
  {
    name: '📊丨𝖤𝗏𝖾𝗇𝗍𝗂-𝖬𝗉𝗅𝗎𝗌',
    type: ChannelType.GuildText,
    topic: 'Race M+, tornei M+, eventi dedicati.',
  },
  {
    name: '🔊丨𝖬-𝖯𝗅𝗎𝗌',
    type: ChannelType.GuildVoice,
    topic: 'Canale vocale M+.',
  },
];

// ── Main ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', async () => {
  console.log(`Connected as ${client.user.tag}`);
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();

  const results = { created: [], skipped: [], errors: [] };

  // 1. Create new M+ category
  console.log('\n=== Creating M+ category ===');
  let mplusCat;
  const existingCat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === NEW_CATEGORY.name
  );
  if (existingCat) {
    console.log(`  SKIP: Category "${NEW_CATEGORY.name}" already exists (ID: ${existingCat.id})`);
    mplusCat = existingCat;
    results.skipped.push(`Category: ${NEW_CATEGORY.name}`);
  } else {
    try {
      mplusCat = await guild.channels.create({
        name: NEW_CATEGORY.name,
        type: ChannelType.GuildCategory,
        position: NEW_CATEGORY.position,
        permissionOverwrites: NEW_CATEGORY.overwrites,
      });
      console.log(`  CREATED: Category "${NEW_CATEGORY.name}" (ID: ${mplusCat.id})`);
      results.created.push(`Category: ${NEW_CATEGORY.name} (ID: ${mplusCat.id})`);
    } catch (err) {
      console.error(`  ERROR creating category: ${err.message}`);
      results.errors.push(`Category: ${err.message}`);
    }
  }

  // 2. Create M+ channels in the new category
  if (mplusCat) {
    console.log('\n=== Creating M+ channels ===');
    for (const ch of NEW_CATEGORY_CHANNELS) {
      const existing = guild.channels.cache.find(
        c => c.parentId === mplusCat.id && c.name === ch.name
      );
      if (existing) {
        console.log(`  SKIP: "${ch.name}" already exists in M+ category`);
        results.skipped.push(`Channel: ${ch.name}`);
        continue;
      }
      try {
        const created = await guild.channels.create({
          name: ch.name,
          type: ch.type,
          parent: mplusCat.id,
          topic: ch.topic,
          permissionOverwrites: NEW_CATEGORY.overwrites,
        });
        console.log(`  CREATED: "${ch.name}" (ID: ${created.id})`);
        results.created.push(`Channel: ${ch.name} (ID: ${created.id})`);
      } catch (err) {
        console.error(`  ERROR creating "${ch.name}": ${err.message}`);
        results.errors.push(`Channel ${ch.name}: ${err.message}`);
      }
    }
  }

  // 3. Create channels in existing categories
  console.log('\n=== Creating channels in existing categories ===');
  for (const ch of CHANNELS_TO_CREATE) {
    // Check if channel already exists with same name in same parent
    const existing = guild.channels.cache.find(
      c => c.parentId === ch.parent && c.name === ch.name
    );
    if (existing) {
      console.log(`  SKIP: "${ch.name}" already exists in target category`);
      results.skipped.push(`Channel: ${ch.name}`);
      continue;
    }

    try {
      const created = await guild.channels.create({
        name: ch.name,
        type: ch.type,
        parent: ch.parent,
        topic: ch.topic,
        permissionOverwrites: ch.overwrites,
      });
      console.log(`  CREATED: "${ch.name}" (ID: ${created.id}) in category ${ch.parent}`);
      results.created.push(`Channel: ${ch.name} (ID: ${created.id})`);
    } catch (err) {
      console.error(`  ERROR creating "${ch.name}": ${err.message}`);
      results.errors.push(`Channel ${ch.name}: ${err.message}`);
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Created: ${results.created.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors:  ${results.errors.length}`);
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log('\nCreated items:');
  results.created.forEach(c => console.log(`  + ${c}`));
  if (results.skipped.length > 0) {
    console.log('\nSkipped (already exist):');
    results.skipped.forEach(s => console.log(`  - ${s}`));
  }

  client.destroy();
});

client.login(TOKEN);
