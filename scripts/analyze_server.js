// scripts/analyze_server.js
// Non-destructive Discord server structure snapshot for the Bloods community guild.
//
// Connects with DISCORD_TOKEN, inspects the guild identified by GUILD_ID, and
// extracts Roles, Categories and Channels (text & voice) with their permission
// overrides. Writes raw JSON to server_structure_report.json in the project root
// and prints a formatted summary to the console.
//
// Usage:  node scripts/analyze_server.js
// Read-only: this script never mutates the server.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
  console.error('ERROR: DISCORD_TOKEN is not set in .env');
  process.exit(1);
}
if (!GUILD_ID) {
  console.error('ERROR: GUILD_ID is not set in .env');
  process.exit(1);
}

// Permissions considered "key" / sensitive — surfaced explicitly in the report.
const KEY_PERMISSIONS = [
  'Administrator',
  'ManageGuild',
  'ManageRoles',
  'ManageChannels',
  'ManageWebhooks',
  'ManageMessages',
  'ManageThreads',
  'KickMembers',
  'BanMembers',
  'MentionEveryone',
  'ViewAuditLog',
  'ManageEmojisAndStickers',
  'ManageEvents',
  'ModerateMembers',
  'ViewGuildInsights',
];

// Keywords used to flag legacy World of Warcraft / "Bloods" guild channels that
// must remain isolated and preserved. Includes Italian WoW terminology since the
// Bloods community uses Italian names (e.g. Incursione = raid, profession names).
const LEGACY_KEYWORDS = [
  // English
  'wow',
  'world of warcraft',
  'warcraft',
  'azeroth',
  'raid',
  'mythic',
  'dungeon',
  'keystone',
  'm+',
  'mythic+',
  'pve',
  'horde',
  'alliance',
  'guild',
  'bloods',
  'blood',
  'officer',
  'class-hall',
  'class hall',
  'wow-classic',
  'classic-wow',
  'wotlk',
  'tbc',
  'shadowlands',
  'dragonflight',
  'the-war-within',
  'tank',
  'healer',
  'dps',
  'rbg',
  'arena',
  // Italian WoW terms
  'incursione',     // raid
  'spedizione',     // expedition (dungeon-ish)
  'prenotazione',   // sign-up (raid sign-ups)
  'fazione',        // faction
  'regno',          // kingdom
  'duello',         // duel
  'consigv',        // consigv di gilda (guild council) — partial safe match
  'reclutatore',    // recruiter
  'alchimia',       // alchemy
  'forgiatura',     // blacksmithing
  'ingegneria',     // engineering
  'oreficeria',     // jewelcrafting
  'runografia',     // inscription
  'conciatura',     // leatherworking
  'sartoria',       // tailoring
  'erbalismo',      // herbalism
  'estrazione',     // mining
  'scuoiatura',     // skinning
];

const channelTypeLabel = (type) => {
  switch (type) {
    case ChannelType.GuildText: return 'text';
    case ChannelType.GuildVoice: return 'voice';
    case ChannelType.GuildCategory: return 'category';
    case ChannelType.GuildAnnouncement: return 'announcement';
    case ChannelType.GuildStageVoice: return 'stage';
    case ChannelType.GuildForum: return 'forum';
    case ChannelType.GuildMedia: return 'media';
    case ChannelType.GuildDirectory: return 'directory';
    default: return `other(${type})`;
  }
};

const isLegacyName = (name) => {
  if (!name) return false;
  // NFKC normalization collapses decorative "Mathematical Alphanumeric Symbols"
  // (fraktur, bold-script, etc. — e.g. 𝔅𝔩𝔬𝔬𝔡𝔰 -> Bloods, 𝖡𝗅𝗈𝗈𝖽𝗌 -> Bloods)
  // back to plain ASCII so keyword matching actually works on stylized names.
  const lower = name.normalize('NFKC').toLowerCase();
  return LEGACY_KEYWORDS.some((kw) => {
    // Use word-ish boundaries to avoid false positives like "scrolled" matching "wow".
    if (kw.length <= 3) {
      return new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(lower);
    }
    return lower.includes(kw);
  });
};

const serializeOverwrites = (overwrites, everyoneId) => {
  const out = [];
  for (const ow of overwrites.cache.values()) {
    out.push({
      id: ow.id,
      type: ow.type, // 0 = role, 1 = member
      target: ow.id === everyoneId ? '@everyone' : ow.type === 1 ? `member:${ow.id}` : `role:${ow.id}`,
      allow: ow.allow.toArray(),
      deny: ow.deny.toArray(),
    });
  }
  return out;
};

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.GuildMember],
  });

  await client.login(TOKEN);
  console.log(`Connected as ${client.user.tag}`);

  // Fetch the guild fully (force cache refresh).
  const guild = await client.guilds.fetch(GUILD_ID, { force: true });
  console.log(`Inspecting guild: ${guild.name} (${guild.id})`);

  // Pull all members so role member counts are accurate.
  console.log('Fetching all members (this may take a moment on large servers)...');
  await guild.members.fetch({ withPresences: false });
  const memberCount = guild.memberCount;
  console.log(`Members cached. Server memberCount = ${memberCount}`);

  // ── Roles ────────────────────────────────────────────────────────────────
  const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
  const roleReport = roles.map((r) => {
    const perms = r.permissions.toArray();
    const keyPerms = perms.filter((p) => KEY_PERMISSIONS.includes(p));
    return {
      id: r.id,
      name: r.name,
      position: r.position,
      color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : null,
      hex_color: r.color,
      hoisted: r.hoist,
      mentionable: r.mentionable,
      managed: r.managed,
      is_everyone: r.id === guild.id,
      member_count: r.members.size,
      permissions: perms,
      key_permissions: keyPerms,
      has_administrator: perms.includes('Administrator'),
    };
  });

  // ── Channels & Categories ────────────────────────────────────────────────
  // Fetch all channels fresh.
  await guild.channels.fetch();
  const channels = [...guild.channels.cache.values()];

  const categories = channels
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  const categoryReport = categories.map((cat) => {
    const children = channels
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: channelTypeLabel(c.type),
        raw_type: c.type,
        position: c.position,
        parent_id: c.parentId,
        nsfw: typeof c.nsfw === 'boolean' ? c.nsfw : null,
        topic: c.topic || null,
        permission_overwrites: serializeOverwrites(c.permissionOverwrites, guild.id),
      }));
    return {
      id: cat.id,
      name: cat.name,
      type: 'category',
      raw_type: cat.type,
      position: cat.position,
      parent_id: cat.parentId,
      permission_overwrites: serializeOverwrites(cat.permissionOverwrites, guild.id),
      children_count: children.length,
      children,
    };
  });

  // Channels with no parent (loose / top-level non-category channels).
  const looseChannels = channels
    .filter((c) => c.type !== ChannelType.GuildCategory && c.parentId === null)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: channelTypeLabel(c.type),
      raw_type: c.type,
      position: c.position,
      parent_id: c.parentId,
      nsfw: typeof c.nsfw === 'boolean' ? c.nsfw : null,
      topic: c.topic || null,
      permission_overwrites: serializeOverwrites(c.permissionOverwrites, guild.id),
    }));

  const channelTypeCounts = channels.reduce((acc, c) => {
    const label = channelTypeLabel(c.type);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  // ── Legacy WoW / Bloods identification ───────────────────────────────────
  const legacyCategories = categoryReport.filter((c) => isLegacyName(c.name));
  const legacyChannels = [];
  for (const cat of categoryReport) {
    if (isLegacyName(cat.name) || isLegacyName(cat.name) === false) {
      // checked below per child too
    }
    for (const ch of cat.children) {
      if (isLegacyName(ch.name)) {
        legacyChannels.push({ ...ch, category: cat.name, category_id: cat.id });
      }
    }
  }
  for (const ch of looseChannels) {
    if (isLegacyName(ch.name)) {
      legacyChannels.push({ ...ch, category: '(no category)', category_id: null });
    }
  }
  // Also flag a category as legacy if its name matches (already in legacyCategories),
  // and include the whole category subtree for preservation awareness.
  const legacySubtrees = legacyCategories.map((c) => ({
    category_id: c.id,
    category: c.name,
    children_count: c.children_count,
    child_channels: c.children.map((ch) => ({ id: ch.id, name: ch.name, type: ch.type })),
  }));

  // ── Assemble raw report ──────────────────────────────────────────────────
  const report = {
    generated_at: new Date().toISOString(),
    bot: { tag: client.user.tag, id: client.user.id },
    guild: {
      id: guild.id,
      name: guild.name,
      member_count: memberCount,
      approximate_presence: guild.approximatePresenceCount ?? null,
      approximate_online: guild.approximateMemberCount ?? null,
      premium_tier: guild.premiumTier,
      vanity_url_code: guild.vanityURLCode || null,
      icon_url: guild.iconURL({ size: 256 }),
    },
    summary: {
      total_roles: roleReport.length,
      total_categories: categoryReport.length,
      total_channels: channels.length,
      channel_type_counts: channelTypeCounts,
      loose_top_level_channels: looseChannels.length,
      legacy_candidate_categories: legacyCategories.length,
      legacy_candidate_channels: legacyChannels.length,
    },
    roles: roleReport,
    categories: categoryReport,
    loose_channels: looseChannels,
    legacy: {
      categories: legacyCategories.map((c) => ({
        id: c.id, name: c.name, position: c.position, children_count: c.children_count,
      })),
      channels: legacyChannels,
      subtrees: legacySubtrees,
    },
  };

  const outPath = path.join(__dirname, '..', 'server_structure_report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nRaw report written to: ${outPath}`);

  // ── Formatted console summary ────────────────────────────────────────────
  console.log('\n================ SERVER STRUCTURE SUMMARY ================\n');
  console.log(`Guild: ${guild.name}  (${guild.id})`);
  console.log(`Members: ${memberCount}`);
  console.log(`Roles: ${report.summary.total_roles}`);
  console.log(`Categories: ${report.summary.total_categories}`);
  console.log(`Total channels: ${report.summary.total_channels}`);
  console.log('Channel type counts:');
  for (const [t, n] of Object.entries(channelTypeCounts)) {
    console.log(`   - ${t}: ${n}`);
  }
  console.log(`Top-level (uncategorized) non-category channels: ${looseChannels.length}`);

  console.log('\n--- Roles (by position, high -> low) ---');
  for (const r of roleReport) {
    const tag = r.is_everyone ? ' [@everyone]' : '';
    const admin = r.has_administrator ? ' [ADMIN]' : '';
    const kp = r.key_permissions.length ? ` keyPerms=[${r.key_permissions.join(',')}]` : '';
    console.log(
      `  #${String(r.position).padStart(3)} ${r.name}${tag}${admin} — members: ${r.member_count}${kp}`
    );
  }

  console.log('\n--- Category hierarchy & channel counts ---');
  for (const cat of categoryReport) {
    const legacy = isLegacyName(cat.name) ? '  <LEGACY-WOW/BLOODS?>' : '';
    console.log(`  [${cat.position}] ${cat.name} (${cat.children_count} children)${legacy}`);
    for (const ch of cat.children) {
      const cl = isLegacyName(ch.name) ? '  <LEGACY-WOW/BLOODS?>' : '';
      console.log(`        - (${ch.type}) ${ch.name}${cl}`);
    }
  }
  if (looseChannels.length) {
    console.log('\n--- Uncategorized top-level channels ---');
    for (const ch of looseChannels) {
      const cl = isLegacyName(ch.name) ? '  <LEGACY-WOW/BLOODS?>' : '';
      console.log(`  - (${ch.type}) ${ch.name}${cl}`);
    }
  }

  console.log('\n--- Legacy World of Warcraft / "Bloods" preservation candidates ---');
  if (!legacyCategories.length && !legacyChannels.length) {
    console.log('  None detected by keyword heuristics.');
  } else {
    if (legacyCategories.length) {
      console.log(`  Legacy-flagged categories (${legacyCategories.length}):`);
      for (const c of legacyCategories) {
        console.log(`    - ${c.name} (id=${c.id}, ${c.children_count} children)`);
      }
    }
    if (legacyChannels.length) {
      console.log(`  Legacy-flagged channels (${legacyChannels.length}):`);
      for (const ch of legacyChannels) {
        console.log(`    - [${ch.category}] ${ch.name} (id=${ch.id}, type=${ch.type})`);
      }
    }
    console.log('\n  NOTE: These are keyword-based candidates. Review manually before any');
    console.log('  migration/restructure to ensure legacy WoW/Bloods content stays isolated & preserved.');
  }

  console.log('\n===========================================================\n');

  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Analysis failed:', err);
  process.exit(1);
});
