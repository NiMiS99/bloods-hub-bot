// scripts/deep_analyze_server.js
// ============================================================================
//  Deep relational analysis of the Bloods Community Discord server.
//
//  STRICTLY READ-ONLY: this script never mutates roles, channels, or any
//  server state. It only fetches and analyses data.
//
//  Produces DISCORD_CONCEPTUAL_MAP.md in the project root with:
//    A. Current User Journey (what @everyone / community / Bloods members see)
//    B. Role Hierarchy & Intersection (Bloods vs Community overlap + perms)
//    C. Bot Integration Map (bots, roles, high-level permissions, conflicts)
//    D. Channel Reusability List (generic channels to repurpose, not duplicate)
//    E. Permission Inconsistencies (orphaned denies, conflicting overrides)
//
//  Usage:  node scripts/deep_analyze_server.js
// ============================================================================
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.error('ERROR: DISCORD_TOKEN and GUILD_ID must be set in .env');
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────

const channelTypeLabel = (type) => {
  const map = {
    [ChannelType.GuildText]: 'text',
    [ChannelType.GuildVoice]: 'voice',
    [ChannelType.GuildCategory]: 'category',
    [ChannelType.GuildAnnouncement]: 'announcement',
    [ChannelType.GuildStageVoice]: 'stage',
    [ChannelType.GuildForum]: 'forum',
    [ChannelType.GuildMedia]: 'media',
  };
  return map[type] || `other(${type})`;
};

const norm = (s) => (s || '').normalize('NFKC');

// Check if a role has a permission bit
const hasPerm = (role, flag) => role.permissions.has(flag);

// Get all permission names for a role
const permNames = (role) => role.permissions.toArray();

// High-level permissions to flag for bots
const HIGH_LEVEL_PERMS = [
  { flag: PermissionsBitField.Flags.Administrator, name: 'Administrator' },
  { flag: PermissionsBitField.Flags.ManageRoles, name: 'ManageRoles' },
  { flag: PermissionsBitField.Flags.ManageChannels, name: 'ManageChannels' },
  { flag: PermissionsBitField.Flags.ManageGuild, name: 'ManageGuild' },
  { flag: PermissionsBitField.Flags.ManageWebhooks, name: 'ManageWebhooks' },
  { flag: PermissionsBitField.Flags.ManageMessages, name: 'ManageMessages' },
  { flag: PermissionsBitField.Flags.BanMembers, name: 'BanMembers' },
  { flag: PermissionsBitField.Flags.KickMembers, name: 'KickMembers' },
  { flag: PermissionsBitField.Flags.MentionEveryone, name: 'MentionEveryone' },
  { flag: PermissionsBitField.Flags.ManageEmojisAndStickers, name: 'ManageEmojisAndStickers' },
  { flag: PermissionsBitField.Flags.ManageEvents, name: 'ManageEvents' },
  { flag: PermissionsBitField.Flags.ModerateMembers, name: 'ModerateMembers' },
  { flag: PermissionsBitField.Flags.ViewAuditLog, name: 'ViewAuditLog' },
  { flag: PermissionsBitField.Flags.ManageThreads, name: 'ManageThreads' },
];

// Generic channel keywords — channels that are not game-specific and could be
// repurposed by the bot instead of creating duplicates.
const GENERIC_CHANNEL_KEYWORDS = [
  'welcome', 'benvenuto', 'rules', 'regolamento', 'role-selection',
  'scegli-giochi', 'general', 'generale', 'chat', 'announcements',
  'news', 'comunicazioni', 'comunicazione', 'afk', 'media', 'social',
  'off-topic', 'memes', 'ticket', 'assistenza', 'support',
  'log', 'audit', 'mod-log', 'wiki', 'tutorial', 'admin',
  'bot', 'comandi', 'commands', 'help', 'aiuto',
];

// Legacy WoW keywords (same as analyze_server.js, NFKC-normalized)
const LEGACY_KEYWORDS = [
  'wow', 'world of warcraft', 'warcraft', 'azeroth', 'raid', 'mythic',
  'dungeon', 'keystone', 'm+', 'mythic+', 'pve', 'horde', 'alliance',
  'guild', 'bloods', 'blood', 'officer', 'class-hall', 'class hall',
  'wow-classic', 'classic-wow', 'wotlk', 'tbc', 'shadowlands',
  'dragonflight', 'the-war-within', 'tank', 'healer', 'dps', 'rbg',
  'arena', 'incursione', 'spedizione', 'prenotazione', 'fazione',
  'regno', 'duello', 'reclutatore', 'alchimia', 'forgiatura',
  'ingegneria', 'oreficeria', 'runografia', 'conciatura', 'sartoria',
  'erbalismo', 'estrazione', 'scuoiatura',
];

const isLegacyName = (name) => {
  const lower = norm(name).toLowerCase();
  return LEGACY_KEYWORDS.some((kw) => {
    if (kw.length <= 3) {
      return new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(lower);
    }
    return lower.includes(kw);
  });
};

const isGenericName = (name) => {
  const lower = norm(name).toLowerCase();
  return GENERIC_CHANNEL_KEYWORDS.some((kw) => lower.includes(kw));
};

// ── Main ───────────────────────────────────────────────────────────────────

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

  const guild = await client.guilds.fetch(GUILD_ID, { force: true });
  console.log(`Analysing guild: ${guild.name} (${guild.id})`);

  // Fetch all members and channels fresh
  console.log('Fetching all members...');
  await guild.members.fetch({ withPresences: false });
  await guild.channels.fetch();
  console.log(`Members: ${guild.memberCount} | Channels: ${guild.channels.cache.size}`);

  const everyoneRole = guild.roles.everyone;
  const everyoneId = everyoneRole.id;

  // ── Identify core roles ──────────────────────────────────────────────────
  // "Bloods" = the legacy WoW guild role (exact or close match)
  // "Membro della community" / "Bloods Community" = the broader community role
  const allRoles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

  const bloodsRole = allRoles.find((r) => norm(r.name).toLowerCase() === 'bloods');
  // Match "Membro della community" or any role with "community" in the name (excluding "Bloods" itself)
  const communityRole = allRoles.find((r) => {
    const n = norm(r.name).toLowerCase();
    return n.includes('community') && !n.includes('bloods');
  }) || allRoles.find((r) => norm(r.name).toLowerCase() === 'membro della community');

  console.log(`Bloods role: ${bloodsRole ? bloodsRole.name + ' (' + bloodsRole.id + ')' : 'NOT FOUND'}`);
  console.log(`Community role: ${communityRole ? communityRole.name + ' (' + communityRole.id + ')' : 'NOT FOUND'}`);

  // ── 2. Role Intersection & Logic Analysis ────────────────────────────────
  const bloodsMembers = bloodsRole ? new Set([...bloodsRole.members.keys()]) : new Set();
  const communityMembers = communityRole ? new Set([...communityRole.members.keys()]) : new Set();

  const bothSet = new Set();
  const onlyBloodsSet = new Set();
  const onlyCommunitySet = new Set();
  for (const id of bloodsMembers) {
    if (communityMembers.has(id)) bothSet.add(id);
    else onlyBloodsSet.add(id);
  }
  for (const id of communityMembers) {
    if (!bloodsMembers.has(id)) onlyCommunitySet.add(id);
  }

  const bloodsPerms = bloodsRole ? permNames(bloodsRole) : [];
  const communityPerms = communityRole ? permNames(communityRole) : [];
  const everyonePerms = permNames(everyoneRole);

  // Permission bitfield as numeric value
  const bloodsBitfield = bloodsRole ? bloodsRole.permissions.bitfield.toString() : 'N/A';
  const communityBitfield = communityRole ? communityRole.permissions.bitfield.toString() : 'N/A';
  const everyoneBitfield = everyoneRole.permissions.bitfield.toString();

  // ── Channel override scan for core roles ─────────────────────────────────
  const channels = [...guild.channels.cache.values()];
  const targetRoleIds = {
    '@everyone': everyoneId,
  };
  if (bloodsRole) targetRoleIds['Bloods'] = bloodsRole.id;
  if (communityRole) targetRoleIds['Community'] = communityRole.id;

  const channelOverrides = [];
  for (const ch of channels) {
    const overrides = {};
    for (const [label, roleId] of Object.entries(targetRoleIds)) {
      const ow = ch.permissionOverwrites.cache.get(roleId);
      if (ow) {
        overrides[label] = {
          type: ow.type,
          allow: ow.allow.toArray(),
          deny: ow.deny.toArray(),
          view_channel_allow: ow.allow.has(PermissionsBitField.Flags.ViewChannel),
          view_channel_deny: ow.deny.has(PermissionsBitField.Flags.ViewChannel),
        };
      }
    }
    if (Object.keys(overrides).length > 0) {
      channelOverrides.push({
        id: ch.id,
        name: ch.name,
        type: channelTypeLabel(ch.type),
        position: ch.position,
        parent_id: ch.parentId,
        parent_name: ch.parent ? ch.parent.name : null,
        overrides,
      });
    }
  }

  // ── 3. Bot Ecosystem Mapping ─────────────────────────────────────────────
  const botMembers = [...guild.members.cache.values()].filter((m) => m.user.bot);
  const botReport = [];
  for (const bot of botMembers) {
    const botRoles = [...bot.roles.cache.values()]
      .filter((r) => r.id !== everyoneId)
      .sort((a, b) => b.position - a.position);
    const highPerms = [];
    for (const role of botRoles) {
      for (const { flag, name } of HIGH_LEVEL_PERMS) {
        if (hasPerm(role, flag) && !highPerms.includes(name)) {
          highPerms.push(name);
        }
      }
    }
    // Also check @everyone perms that the bot inherits
    for (const { flag, name } of HIGH_LEVEL_PERMS) {
      if (hasPerm(everyoneRole, flag) && !highPerms.includes(name)) {
        highPerms.push(name + ' (via @everyone)');
      }
    }
    botReport.push({
      tag: bot.user.tag,
      id: bot.user.id,
      roles: botRoles.map((r) => ({ name: r.name, id: r.id, position: r.position })),
      high_level_permissions: highPerms,
      has_administrator: highPerms.includes('Administrator'),
      joined_at: bot.joinedAt ? bot.joinedAt.toISOString() : null,
    });
  }

  // ── 4. Channel Reusability & Permission Inconsistencies ──────────────────
  // Generic channels that can be repurposed
  const reusableChannels = [];
  for (const ch of channels) {
    if (ch.type === ChannelType.GuildCategory) continue;
    const n = norm(ch.name).toLowerCase();
    if (isGenericName(ch.name) && !isLegacyName(ch.name)) {
      const everyoneOW = ch.permissionOverwrites.cache.get(everyoneId);
      reusableChannels.push({
        id: ch.id,
        name: ch.name,
        type: channelTypeLabel(ch.type),
        position: ch.position,
        parent_name: ch.parent ? ch.parent.name : '(no category)',
        parent_id: ch.parentId,
        everyone_visible: everyoneOW ? !everyoneOW.deny.has(PermissionsBitField.Flags.ViewChannel) : true,
        topic: ch.topic || null,
      });
    }
  }

  // Permission inconsistencies: channels where @everyone is denied ViewChannel
  // but NO role has an explicit ViewChannel allow (orphaned/inaccessible).
  const inconsistencies = [];
  for (const ch of channels) {
    if (ch.type === ChannelType.GuildCategory) {
      // For categories, check if @everyone denied and no role allowed
      const everyoneOW = ch.permissionOverwrites.cache.get(everyoneId);
      const everyoneDenied = everyoneOW && everyoneOW.deny.has(PermissionsBitField.Flags.ViewChannel);
      if (everyoneDenied) {
        let hasAllow = false;
        for (const ow of ch.permissionOverwrites.cache.values()) {
          if (ow.id === everyoneId) continue;
          if (ow.allow.has(PermissionsBitField.Flags.ViewChannel)) {
            hasAllow = true;
            break;
          }
        }
        if (!hasAllow) {
          inconsistencies.push({
            id: ch.id,
            name: ch.name,
            type: 'category',
            issue: '@everyone denied ViewChannel but no role has explicit ViewChannel allow — category may be invisible to all non-admins',
          });
        }
      }
    } else {
      // For channels: check if @everyone denied AND no role allowed AND
      // parent category doesn't grant access either
      const everyoneOW = ch.permissionOverwrites.cache.get(everyoneId);
      const everyoneDenied = everyoneOW && everyoneOW.deny.has(PermissionsBitField.Flags.ViewChannel);
      if (everyoneDenied) {
        let hasAllow = false;
        for (const ow of ch.permissionOverwrites.cache.values()) {
          if (ow.id === everyoneId) continue;
          if (ow.allow.has(PermissionsBitField.Flags.ViewChannel)) {
            hasAllow = true;
            break;
          }
        }
        // Check parent category
        if (!hasAllow && ch.parent) {
          const parentEveryoneOW = ch.parent.permissionOverwrites.cache.get(everyoneId);
          if (parentEveryoneOW && parentEveryoneOW.allow.has(PermissionsBitField.Flags.ViewChannel)) {
            hasAllow = true;
          }
          for (const ow of ch.parent.permissionOverwrites.cache.values()) {
            if (ow.id === everyoneId) continue;
            if (ow.allow.has(PermissionsBitField.Flags.ViewChannel)) {
              hasAllow = true;
              break;
            }
          }
        }
        if (!hasAllow) {
          inconsistencies.push({
            id: ch.id,
            name: ch.name,
            type: channelTypeLabel(ch.type),
            parent_name: ch.parent ? ch.parent.name : null,
            issue: '@everyone denied ViewChannel, no role has explicit allow, parent does not compensate — channel may be invisible to all non-admins',
          });
        }
      }
    }
  }

  // Also flag: channels where @everyone is allowed but a specific role is
  // explicitly denied ViewChannel (potential accidental lockout)
  const roleLockouts = [];
  if (bloodsRole || communityRole) {
    for (const ch of channels) {
      for (const [label, role] of Object.entries({
        Bloods: bloodsRole,
        Community: communityRole,
      })) {
        if (!role) continue;
        const ow = ch.permissionOverwrites.cache.get(role.id);
        if (ow && ow.deny.has(PermissionsBitField.Flags.ViewChannel)) {
          roleLockouts.push({
            id: ch.id,
            name: ch.name,
            type: channelTypeLabel(ch.type),
            role: label,
            issue: `${label} role explicitly DENIED ViewChannel on this channel`,
          });
        }
      }
    }
  }

  // ── 5. Generate DISCORD_CONCEPTUAL_MAP.md ────────────────────────────────
  const md = buildMarkdown({
    guild,
    generatedAt: new Date().toISOString(),
    bloodsRole,
    communityRole,
    everyoneRole,
    intersection: {
      both: bothSet.size,
      onlyBloods: onlyBloodsSet.size,
      onlyCommunity: onlyCommunitySet.size,
      bloodsTotal: bloodsMembers.size,
      communityTotal: communityMembers.size,
    },
    perms: {
      bloods: bloodsPerms,
      community: communityPerms,
      everyone: everyonePerms,
      bloodsBitfield,
      communityBitfield,
      everyoneBitfield,
    },
    channelOverrides,
    botReport,
    reusableChannels,
    inconsistencies,
    roleLockouts,
    channels,
    allRoles,
  });

  const outPath = path.join(__dirname, '..', 'DISCORD_CONCEPTUAL_MAP.md');
  fs.writeFileSync(outPath, md);
  console.log(`\nConceptual map written to: ${outPath}`);

  // ── Console confirmation summary ─────────────────────────────────────────
  console.log('\n========== DEEP ANALYSIS SUMMARY ==========\n');
  console.log(`Guild: ${guild.name} (${guild.id}) — ${guild.memberCount} members`);
  console.log(`\nRole Intersection:`);
  console.log(`  Bloods role:        ${bloodsRole ? bloodsRole.name + ' (' + bloodsMembers.size + ' members)' : 'NOT FOUND'}`);
  console.log(`  Community role:     ${communityRole ? communityRole.name + ' (' + communityMembers.size + ' members)' : 'NOT FOUND'}`);
  console.log(`  Both roles:         ${bothSet.size}`);
  console.log(`  Only Bloods:        ${onlyBloodsSet.size}`);
  console.log(`  Only Community:     ${onlyCommunitySet.size}`);
  console.log(`\nBots detected: ${botReport.length}`);
  for (const b of botReport) {
    console.log(`  • ${b.tag} — admin=${b.has_administrator} highPerms=[${b.high_level_permissions.join(', ')}]`);
  }
  console.log(`\nChannel overrides for core roles: ${channelOverrides.length} channels have explicit overrides`);
  console.log(`Reusable generic channels: ${reusableChannels.length}`);
  console.log(`Permission inconsistencies: ${inconsistencies.length}`);
  console.log(`Role lockouts (Bloods/Community denied): ${roleLockouts.length}`);
  console.log('\n===========================================\n');

  await client.destroy();
  process.exit(0);
}

// ── Markdown builder ───────────────────────────────────────────────────────

function buildMarkdown(ctx) {
  const {
    guild, generatedAt, bloodsRole, communityRole, everyoneRole,
    intersection, perms, channelOverrides, botReport,
    reusableChannels, inconsistencies, roleLockouts, channels, allRoles,
  } = ctx;

  const lines = [];
  const push = (s) => lines.push(s);

  push(`# Discord Conceptual Map — ${guild.name}`);
  push('');
  push(`> **Generated:** ${generatedAt}`);
  push(`> **Guild ID:** ${guild.id}`);
  push(`> **Members:** ${guild.memberCount}`);
  push(`> **Analysis:** Read-only, non-destructive — no server state was modified.`);
  push('');
  push('---');
  push('');

  // ── A. Current User Journey ──────────────────────────────────────────────
  push('## A. Current User Journey');
  push('');
  push('This section deduces what a user sees at each tier of access, based on');
  push('the actual permission overrides found on the server.');
  push('');

  // Calculate what @everyone can see
  const everyoneVisible = [];
  const everyoneDenied = [];
  for (const ch of channels) {
    if (ch.type === ChannelType.GuildCategory) continue;
    const ow = ch.permissionOverwrites.cache.get(everyoneRole.id);
    const parentOW = ch.parent ? ch.parent.permissionOverwrites.cache.get(everyoneRole.id) : null;
    let visible = true;
    if (ow && ow.deny.has(PermissionsBitField.Flags.ViewChannel)) visible = false;
    else if (parentOW && parentOW.deny.has(PermissionsBitField.Flags.ViewChannel) && (!ow || !ow.allow.has(PermissionsBitField.Flags.ViewChannel))) visible = false;
    if (visible) everyoneVisible.push(ch);
    else everyoneDenied.push(ch);
  }

  push('### A.1 — New User (only @everyone)');
  push('');
  push(`A brand-new member with no additional roles can see **${everyoneVisible.length}** channels`);
  push(`(out of ${channels.filter(c => c.type !== ChannelType.GuildCategory).length} non-category channels).`);
  push('');
  if (everyoneVisible.length > 0) {
    push('**Visible channels:**');
    push('');
    for (const ch of everyoneVisible.slice(0, 30)) {
      push(`- \`${ch.name}\` (${channelTypeLabel(ch.type)}) — ${ch.parent ? 'in *' + ch.parent.name + '*' : 'no category'}`);
    }
    if (everyoneVisible.length > 30) push(`- _...and ${everyoneVisible.length - 30} more_`);
  } else {
    push('_No channels visible to @everyone alone (all gated behind roles)._');
  }
  push('');
  push(`**Hidden channels:** ${everyoneDenied.length} channels require specific roles to access.`);
  push('');

  // Bloods role visibility
  if (bloodsRole) {
    const bloodsExtra = [];
    for (const ch of everyoneDenied) {
      const ow = ch.permissionOverwrites.cache.get(bloodsRole.id);
      const parentOW = ch.parent ? ch.parent.permissionOverwrites.cache.get(bloodsRole.id) : null;
      if ((ow && ow.allow.has(PermissionsBitField.Flags.ViewChannel)) ||
          (parentOW && parentOW.allow.has(PermissionsBitField.Flags.ViewChannel))) {
        bloodsExtra.push(ch);
      }
    }
    push('### A.2 — Bloods Guild Member (@everyone + "Bloods" role)');
    push('');
    push(`In addition to the @everyone channels, a member with the **${bloodsRole.name}** role`);
    push(`gains access to approximately **${bloodsExtra.length}** additional channels.`);
    push('');
    if (bloodsExtra.length > 0) {
      push('**Bloods-exclusive channels:**');
      push('');
      for (const ch of bloodsExtra.slice(0, 20)) {
        push(`- \`${ch.name}\` (${channelTypeLabel(ch.type)}) — ${ch.parent ? 'in *' + ch.parent.name + '*' : 'no category'}`);
      }
      if (bloodsExtra.length > 20) push(`- _...and ${bloodsExtra.length - 20} more_`);
    } else {
      push('_No channels found with explicit Bloods role ViewChannel allow (may inherit from category)._');
    }
    push('');
  }

  // Community role visibility
  if (communityRole) {
    const communityExtra = [];
    for (const ch of everyoneDenied) {
      const ow = ch.permissionOverwrites.cache.get(communityRole.id);
      const parentOW = ch.parent ? ch.parent.permissionOverwrites.cache.get(communityRole.id) : null;
      if ((ow && ow.allow.has(PermissionsBitField.Flags.ViewChannel)) ||
          (parentOW && parentOW.allow.has(PermissionsBitField.Flags.ViewChannel))) {
        communityExtra.push(ch);
      }
    }
    push('### A.3 — Community Member (@everyone + "' + communityRole.name + '" role)');
    push('');
    push(`In addition to the @everyone channels, a member with the **${communityRole.name}** role`);
    push(`gains access to approximately **${communityExtra.length}** additional channels.`);
    push('');
    if (communityExtra.length > 0) {
      push('**Community-exclusive channels:**');
      push('');
      for (const ch of communityExtra.slice(0, 20)) {
        push(`- \`${ch.name}\` (${channelTypeLabel(ch.type)}) — ${ch.parent ? 'in *' + ch.parent.name + '*' : 'no category'}`);
      }
      if (communityExtra.length > 20) push(`- _...and ${communityExtra.length - 20} more_`);
    } else {
      push('_No channels found with explicit Community role ViewChannel allow._');
    }
    push('');
  }

  push('---');
  push('');

  // ── B. Role Hierarchy & Intersection ─────────────────────────────────────
  push('## B. Role Hierarchy & Intersection');
  push('');
  push('### B.1 — Core Role Comparison');
  push('');
  push('| Property | @everyone | Bloods | ' + (communityRole ? communityRole.name : 'Community') + ' |');
  push('|----------|-----------|--------|' + '-'.repeat(Math.max(10, communityRole ? communityRole.name.length : 10)) + '|');
  push(`| **Role ID** | ${everyoneRole.id} | ${bloodsRole ? bloodsRole.id : 'N/A'} | ${communityRole ? communityRole.id : 'N/A'} |`);
  push(`| **Position** | 0 | ${bloodsRole ? bloodsRole.position : 'N/A'} | ${communityRole ? communityRole.position : 'N/A'} |`);
  push(`| **Members** | ${guild.memberCount} | ${intersection.bloodsTotal} | ${intersection.communityTotal} |`);
  push(`| **Color** | Default | ${bloodsRole && bloodsRole.color ? '#' + bloodsRole.color.toString(16).padStart(6, '0') : 'None'} | ${communityRole && communityRole.color ? '#' + communityRole.color.toString(16).padStart(6, '0') : 'None'} |`);
  push(`| **Hoisted** | No | ${bloodsRole ? bloodsRole.hoist : 'N/A'} | ${communityRole ? communityRole.hoist : 'N/A'} |`);
  push(`| **Mentionable** | Yes | ${bloodsRole ? bloodsRole.mentionable : 'N/A'} | ${communityRole ? communityRole.mentionable : 'N/A'} |`);
  push(`| **Administrator** | ${everyoneRole.permissions.has(PermissionsBitField.Flags.Administrator)} | ${bloodsRole ? bloodsRole.permissions.has(PermissionsBitField.Flags.Administrator) : 'N/A'} | ${communityRole ? communityRole.permissions.has(PermissionsBitField.Flags.Administrator) : 'N/A'} |`);
  push(`| **Permission Bitfield** | ${perms.everyoneBitfield} | ${perms.bloodsBitfield} | ${perms.communityBitfield} |`);
  push('');

  push('### B.2 — Member Overlap (Venn Diagram)');
  push('');
  push('```');
  push(`         Bloods (${intersection.bloodsTotal})`);
  push(`        ┌───────────────┐`);
  push(`        │  Only Bloods  │  Both roles  │`);
  push(`        │   (${intersection.onlyBloods})     │    (${intersection.both})     │`);
  push(`        │               ├──────────────┤`);
  push(`        │               │ Only Community│`);
  push(`        │               │   (${intersection.onlyCommunity})     │`);
  push(`        └───────────────┴──────────────┘`);
  push(`                    Community (${intersection.communityTotal})`);
  push('```');
  push('');
  push(`- **Both Bloods AND Community:** ${intersection.both} members`);
  push(`- **Only Bloods (not Community):** ${intersection.onlyBloods} members`);
  push(`- **Only Community (not Bloods):** ${intersection.onlyCommunity} members`);
  push('');

  push('### B.3 — Permission Breakdown');
  push('');
  push('**@everyone permissions:**');
  push('```');
  push(perms.everyone.length > 0 ? perms.everyone.join(', ') : '(none beyond defaults)');
  push('```');
  push('');
  if (bloodsRole) {
    push('**Bloods role permissions:**');
    push('```');
    push(perms.bloods.length > 0 ? perms.bloods.join(', ') : '(none)');
    push('```');
    push('');
  }
  if (communityRole) {
    push(`**${communityRole.name} permissions:**`);
    push('```');
    push(perms.community.length > 0 ? perms.community.join(', ') : '(none)');
    push('```');
    push('');
  }

  push('### B.4 — Channel Override Map for Core Roles');
  push('');
  push('Channels with explicit ViewChannel overrides for @everyone, Bloods, or Community:');
  push('');
  push('| Channel | Type | @everyone | Bloods | Community |');
  push('|---------|------|-----------|--------|-----------|');
  for (const co of channelOverrides) {
    const ev = co.overrides['@everyone'];
    const bl = co.overrides['Bloods'];
    const cm = co.overrides['Community'];
    const evStr = ev ? (ev.view_channel_deny ? 'DENY' : ev.view_channel_allow ? 'ALLOW' : 'other') : '—';
    const blStr = bl ? (bl.view_channel_deny ? 'DENY' : bl.view_channel_allow ? 'ALLOW' : 'other') : '—';
    const cmStr = cm ? (cm.view_channel_deny ? 'DENY' : cm.view_channel_allow ? 'ALLOW' : 'other') : '—';
    push(`| ${co.name} | ${co.type} | ${evStr} | ${blStr} | ${cmStr} |`);
  }
  push('');

  push('---');
  push('');

  // ── C. Bot Integration Map ───────────────────────────────────────────────
  push('## C. Bot Integration Map');
  push('');
  push(`**${botReport.length} bots** detected on the server:`);
  push('');
  for (const bot of botReport) {
    push(`### ${bot.tag} (\`${bot.id}\`)`);
    push('');
    push(`- **Roles:** ${bot.roles.length > 0 ? bot.roles.map(r => r.name).join(', ') : '(only @everyone)'}`);
    push(`- **High-level permissions:** ${bot.high_level_permissions.length > 0 ? bot.high_level_permissions.join(', ') : 'none'}`);
    push(`- **Administrator:** ${bot.has_administrator ? '⚠️ YES' : 'No'}`);
    if (bot.joined_at) push(`- **Joined:** ${bot.joined_at}`);
    push('');
    // Deduce likely function
    const tag = bot.tag.toLowerCase();
    const roleNames = bot.roles.map(r => r.name.toLowerCase());
    let likelyFunction = 'Unknown';
    if (tag.includes('streamcord') || roleNames.some(r => r.includes('streamcord'))) likelyFunction = 'Streaming alerts / Twitch integration';
    else if (tag.includes('channelbot') || roleNames.some(r => r.includes('channelbot'))) likelyFunction = 'Dynamic voice channel creation';
    else if (tag.includes('ticket') || roleNames.some(r => r.includes('ticket'))) likelyFunction = 'Ticket/support system';
    else if (tag.includes('raid-helper') || tag.includes('raidhelper') || roleNames.some(r => r.includes('raid'))) likelyFunction = 'WoW raid sign-up scheduler';
    else if (tag.includes('wipefest')) likelyFunction = 'WoW raid analysis / wipefest reports';
    else if (tag.includes('rythm')) likelyFunction = 'Music bot';
    else if (tag.includes('inter') && tag.includes('punct')) likelyFunction = 'Punctuation/formatting bot';
    else if (tag.includes('bloods bot')) likelyFunction = '**Our bot** — Bloods Hub multi-game community bot';
    push(`- **Likely function:** ${likelyFunction}`);
    push('');
    // Conflict assessment
    const conflicts = [];
    if (bot.has_administrator && !tag.includes('bloods bot')) {
      conflicts.push('Has Administrator — can modify any channel/role, potential conflict with bot-managed channels');
    }
    if (bot.high_level_permissions.includes('ManageChannels') && !tag.includes('bloods bot')) {
      conflicts.push('Can manage channels — may interfere with bot-created game categories');
    }
    if (bot.high_level_permissions.includes('ManageRoles') && !tag.includes('bloods bot')) {
      conflicts.push('Can manage roles — may interfere with bot-managed game roles');
    }
    if (bot.high_level_permissions.includes('ManageMessages') && !tag.includes('bloods bot')) {
      conflicts.push('Can manage messages — may delete bot embeds in shared channels');
    }
    if (conflicts.length > 0) {
      push(`- **⚠️ Potential conflicts with Bloods Hub Bot:**`);
      for (const c of conflicts) push(`  - ${c}`);
    } else {
      push(`- **No direct conflict with Bloods Hub Bot identified.**`);
    }
    push('');
  }

  push('---');
  push('');

  // ── D. Channel Reusability List ──────────────────────────────────────────
  push('## D. Channel Reusability List');
  push('');
  push('These existing generic channels could be **repurposed** by the bot instead');
  push('of creating duplicates. Channels are filtered to exclude legacy WoW-specific ones.');
  push('');
  if (reusableChannels.length > 0) {
    push('| Channel | Type | Parent | @everyone Visible | Topic |');
    push('|---------|------|--------|-------------------|-------|');
    for (const ch of reusableChannels) {
      const vis = ch.everyone_visible ? 'Yes' : 'No (gated)';
      const topic = ch.topic ? ch.topic.substring(0, 50) : '—';
      push(`| ${ch.name} | ${ch.type} | ${ch.parent_name} | ${vis} | ${topic} |`);
    }
    push('');
    push('**Recommendation:** Before creating new channels (e.g. via `/setup`),');
    push('check if any of the above can be pointed to instead. The bot\'s');
    push('`welcome_channel_id`, `rules_channel_id`, and `role_selection_channel_id`');
    push('config fields can be set to existing channel IDs via `/setup run` or');
    push('`/game update`.');
  } else {
    push('_No generic reusable channels detected — all channels appear to be');
    push('game-specific or legacy WoW channels._');
  }
  push('');

  push('---');
  push('');

  // ── E. Permission Inconsistencies ────────────────────────────────────────
  push('## E. Permission Inconsistencies');
  push('');

  push('### E.1 — Orphaned / Inaccessible Channels');
  push('');
  push('Channels where @everyone is denied ViewChannel but no role has an explicit');
  push('ViewChannel allow (potentially invisible to all non-admin members):');
  push('');
  if (inconsistencies.length > 0) {
    push('| Channel | Type | Issue |');
    push('|---------|------|-------|');
    for (const inc of inconsistencies) {
      push(`| ${inc.name} | ${inc.type} | ${inc.issue} |`);
    }
  } else {
    push('_No orphaned channels detected — all gated channels have at least one');
    push('role with ViewChannel allow._');
  }
  push('');

  push('### E.2 — Role Lockouts');
  push('');
  push('Channels where the Bloods or Community role is explicitly DENIED');
  push('ViewChannel (potential accidental lockout):');
  push('');
  if (roleLockouts.length > 0) {
    push('| Channel | Type | Role | Issue |');
    push('|---------|------|------|-------|');
    for (const rl of roleLockouts) {
      push(`| ${rl.name} | ${rl.type} | ${rl.role} | ${rl.issue} |`);
    }
  } else {
    push('_No role lockouts detected — neither Bloods nor Community is explicitly');
    push('denied ViewChannel on any channel._');
  }
  push('');

  push('---');
  push('');
  push('## Summary');
  push('');
  push('| Metric | Value |');
  push('|--------|-------|');
  push(`| Total members | ${guild.memberCount} |`);
  push(`| Total roles | ${allRoles.length} |`);
  push(`| Total channels | ${channels.length} |`);
  push(`| Bloods members | ${intersection.bloodsTotal} |`);
  push(`| Community members | ${intersection.communityTotal} |`);
  push(`| Overlap (both) | ${intersection.both} |`);
  push(`| Bots | ${botReport.length} |`);
  push(`| Reusable channels | ${reusableChannels.length} |`);
  push(`| Permission inconsistencies | ${inconsistencies.length} |`);
  push(`| Role lockouts | ${roleLockouts.length} |`);
  push('');
  push('---');
  push(`*Generated by \`scripts/deep_analyze_server.js\` — read-only analysis.*`);

  return lines.join('\n');
}

main().catch((err) => {
  console.error('Deep analysis failed:', err);
  process.exit(1);
});
