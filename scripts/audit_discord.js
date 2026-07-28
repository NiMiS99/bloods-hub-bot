// scripts/audit_discord.js
// Audits bot permissions, roles, channels, and configuration on Discord.
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../src/config');

const GUILD_ID = '1010226759817515018';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      console.log('Guild not found');
      process.exit(1);
    }

    // Fetch all data
    await guild.fetch();
    await guild.roles.fetch();
    await guild.channels.fetch();
    const botMember = await guild.members.fetch(client.user.id);

    // === 1. BOT PERMISSIONS ===
    console.log('=== BOT PERMISSIONS ===');
    const perms = botMember.permissions;
    const permFlags = [
      'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
      'ManageMessages', 'KickMembers', 'BanMembers', 'ModerateMembers',
      'SendMessages', 'EmbedLinks', 'AttachFiles', 'ReadMessageHistory',
      'ViewAuditLog', 'AddReactions', 'UseExternalEmojis', 'Connect',
      'Speak', 'MuteMembers', 'MoveMembers', 'PrioritySpeaker',
      'ChangeNickname', 'ManageNicknames', 'ViewChannel', 'SendMessagesInThreads',
      'CreatePublicThreads', 'UseApplicationCommands',
    ];
    const missing = [];
    permFlags.forEach((p) => {
      const has = perms.has(PermissionsBitField.Flags[p]);
      if (!has) missing.push(p);
      console.log(`  ${has ? '✓' : '✗'} ${p}`);
    });
    console.log(`\n  Bot role position: ${botMember.roles.highest.position} / ${guild.roles.cache.size} roles`);
    console.log(`  Bot is owner: ${guild.ownerId === client.user.id}`);

    // === 2. ROLES ===
    console.log('\n=== ROLES (sorted by position desc) ===');
    const roles = guild.roles.cache.sort((a, b) => b.position - a.position);
    console.log(`  Total roles: ${roles.size}`);
    for (const role of roles) {
      const managed = role.managed ? ' [AUTO/MANAGED]' : '';
      const permsList = [];
      const rp = role.permissions;
      if (!rp) continue;
      if (rp.has(PermissionsBitField.Flags.Administrator)) permsList.push('ADMIN');
      if (rp.has(PermissionsBitField.Flags.ManageGuild)) permsList.push('ManageGuild');
      if (rp.has(PermissionsBitField.Flags.ManageRoles)) permsList.push('ManageRoles');
      if (rp.has(PermissionsBitField.Flags.ManageChannels)) permsList.push('ManageChannels');
      if (rp.has(PermissionsBitField.Flags.ManageMessages)) permsList.push('ManageMessages');
      if (rp.has(PermissionsBitField.Flags.KickMembers)) permsList.push('Kick');
      if (rp.has(PermissionsBitField.Flags.BanMembers)) permsList.push('Ban');
      if (rp.has(PermissionsBitField.Flags.ModerateMembers)) permsList.push('Timeout');
      if (rp.has(PermissionsBitField.Flags.MuteMembers)) permsList.push('Mute');
      if (rp.has(PermissionsBitField.Flags.SendMessages)) permsList.push('Send');
      if (rp.has(PermissionsBitField.Flags.ViewAuditLog)) permsList.push('AuditLog');
      const permsStr = permsList.length ? ` perms:[${permsList.join(',')}]` : '';
      const colorStr = role.color ? ` color:${role.color.toString(16)}` : '';
      console.log(`  #${role.position} "${role.name}" (id:${role.id}) members:${role.members.size}${managed}${permsStr}${colorStr}`);
    }

    // === 3. CHANNELS SUMMARY ===
    console.log('\n=== CHANNELS ===');
    const channels = guild.channels.cache.sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    let textCount = 0, voiceCount = 0, catCount = 0, otherCount = 0;
    for (const ch of channels) {
      const t = ch.type;
      if (t === 4 || t === ChannelType.GuildCategory) catCount++;
      else if (t === 0 || t === ChannelType.GuildText || t === 5 || t === ChannelType.GuildAnnouncement) textCount++;
      else if (t === 2 || t === ChannelType.GuildVoice) voiceCount++;
      else otherCount++;
    }
    console.log(`  Categories: ${catCount} | Text: ${textCount} | Voice: ${voiceCount} | Other: ${otherCount}`);
    console.log(`  Total channels: ${channels.size}`);
    // Debug: list all type values
    const typeMap = {};
    for (const ch of channels) {
      const t = String(ch.type);
      typeMap[t] = (typeMap[t] || 0) + 1;
    }
    console.log('  Type distribution:', JSON.stringify(typeMap));

    // === 4. BOT CHANNEL ACCESS ===
    console.log('\n=== BOT CHANNEL ACCESS (text channels) ===');
    const textChannels = channels.filter((c) => c.isTextBased?.() || c.type === 0 || c.type === ChannelType.GuildText || c.type === 5);
    let i = 0;
    for (const ch of textChannels) {
      if (i++ >= 30) {
        console.log('  ... (truncated)');
        break;
      }
      let canView = true, canSend = true, canManage = true, canEmbed = true;
      try {
        const bp = ch.permissionsFor(botMember);
        if (bp) {
          canView = bp.has(PermissionsBitField.Flags.ViewChannel);
          canSend = bp.has(PermissionsBitField.Flags.SendMessages);
          canManage = bp.has(PermissionsBitField.Flags.ManageMessages);
          canEmbed = bp.has(PermissionsBitField.Flags.EmbedLinks);
        }
      } catch (e) {
        // permissionsFor may not work on all channel types
      }
      const status = `${canView ? 'V' : '-'}${canSend ? 'W' : '-'}${canManage ? 'M' : '-'}${canEmbed ? 'E' : '-'}`;
      console.log(`  [${status}] #${ch.name} (id:${ch.id}) type:${ch.type}`);
    }

    // === 5. MUTED ROLE CHECK ===
    console.log('\n=== MUTED ROLE CHECK ===');
    const mutedRole = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === 'muted' || r.name.toLowerCase() === 'mutato' || r.name.toLowerCase() === 'silenzioso'
    );
    if (mutedRole) {
      console.log(`  ✓ Found: "${mutedRole.name}" (id:${mutedRole.id}) position:${mutedRole.position}`);
      console.log(`  Permissions: ${mutedRole.permissions.toArray().join(', ') || '(none)'}`);
      // Check if muted role has SendMessages denied in text channels
      let deniedCount = 0;
      for (const ch of textChannels) {
        const rp = ch.permissionsFor(mutedRole);
        if (rp && !rp.has(PermissionsBitField.Flags.SendMessages)) deniedCount++;
      }
      console.log(`  SendMessages denied in ${deniedCount}/${textChannels.length} text channels`);
    } else {
      console.log('  ✗ NO Muted role found — mute/timeout commands will not work properly!');
      console.log('    → Create a "Muted" role and deny SendMessages + Speak in all channels');
    }

    // === 6. ADMIN ROLE CHECK ===
    console.log('\n=== ADMIN ROLE CHECK ===');
    const adminRoleId = config.admin?.roleId;
    if (adminRoleId) {
      const adminRole = guild.roles.cache.get(adminRoleId);
      if (adminRole) {
        console.log(`  ✓ Admin role: "${adminRole.name}" (id:${adminRole.id}) members:${adminRole.members.size}`);
      } else {
        console.log(`  ✗ Admin role ID ${adminRoleId} from config NOT FOUND in guild!`);
      }
    } else {
      console.log('  ✗ No ADMIN_ROLE_ID set in config');
    }

    // === 7. KEY CHANNELS CHECK ===
    console.log('\n=== KEY CHANNELS CHECK (from DB) ===');
    const { Guild } = require('../src/db');
    const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
    if (guildRow) {
      const checks = [
        ['welcome_channel_id', guildRow.welcome_channel_id],
        ['rules_channel_id', guildRow.rules_channel_id],
        ['role_selection_channel_id', guildRow.role_selection_channel_id],
        ['mod_log_channel_id', guildRow.mod_log_channel_id],
        ['log_channel_id', guildRow.log_channel_id],
        ['announcements_channel_id', guildRow.announcements_channel_id],
        ['level_reward_channel_id', guildRow.level_reward_channel_id],
        ['automod_log_channel_id', guildRow.automod_log_channel_id],
      ];
      for (const [name, id] of checks) {
        if (!id) {
          console.log(`  - ${name}: NOT SET`);
        } else {
          const ch = guild.channels.cache.get(id);
          if (ch) {
            console.log(`  ✓ ${name}: #${ch.name} (id:${id})`);
          } else {
            console.log(`  ✗ ${name}: channel ${id} NOT FOUND (deleted?)`);
          }
        }
      }
    }

    // === 8. AUTOMOD / WELCOME READINESS ===
    console.log('\n=== FEATURE READINESS ===');
    const checks = [
      ['Welcome system', guildRow?.welcome_enabled, !!guildRow?.welcome_channel_id, !!mutedRole],
      ['Auto-mod', guildRow?.automod_enabled, !!guildRow?.automod_log_channel_id, !!mutedRole],
      ['Level rewards', true, !!guildRow?.level_reward_channel_id, botMember.roles.highest.position > 1],
      ['Discord logs', true, !!guildRow?.log_channel_id, perms.has(PermissionsBitField.Flags.ViewAuditLog)],
      ['Mute command', true, !!mutedRole, botMember.roles.highest.position > (mutedRole?.position || 0)],
    ];
    checks.forEach(([name, enabled, configured, ready]) => {
      const status = enabled ? (configured ? (ready ? '✓ READY' : '⚠ PARTIAL') : '✗ NOT CONFIGURED') : '○ DISABLED';
      console.log(`  ${status} — ${name}`);
    });

    // === 9. SUGGESTIONS ===
    console.log('\n=== RECOMMENDATIONS ===');
    if (missing.length > 0) {
      console.log(`  ⚠ Missing bot permissions: ${missing.join(', ')}`);
    }
    if (!mutedRole) {
      console.log('  → Create a "Muted" role (position below bot) and deny SendMessages in all text channels');
    }
    if (botMember.roles.highest.position < 5) {
      console.log('  → Move bot role higher in hierarchy (above managed roles) to allow role assignment');
    }
    if (!guildRow?.log_channel_id) {
      console.log('  → Set log_channel_id in settings for Discord log events');
    }
    if (!guildRow?.automod_log_channel_id) {
      console.log('  → Set automod_log_channel_id for automod action logs');
    }
    if (!guildRow?.welcome_channel_id) {
      console.log('  → Set welcome_channel_id for welcome messages');
    }
    if (!guildRow?.level_reward_channel_id) {
      console.log('  → Set level_reward_channel_id for level-up reward messages');
    }

    process.exit(0);
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
});

client.login(config.discord.token);
