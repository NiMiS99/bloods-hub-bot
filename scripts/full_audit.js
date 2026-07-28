// scripts/full_audit.js
// Comprehensive audit of the entire project.
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../src/config');
const { sequelize } = require('../src/db');
const { Guild, Game, GameMeta, User, LevelReward, AutomodRule, DiscordLog, AuditLog, Warning, Badge, UserBadge, Event } = require('../src/db');

const GUILD_ID = '1010226759817515018';
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

let issues = [];
let warnings = [];

function issue(msg) { issues.push(msg); console.log('  [ISSUE] ' + msg); }
function warn(msg) { warnings.push(msg); console.log('  [WARN] ' + msg); }
function ok(msg) { console.log('  [OK] ' + msg); }

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.fetch();
    await guild.roles.fetch();
    await guild.channels.fetch();
    await guild.members.fetch({ withPresences: false });
    const botMember = await guild.members.fetch(client.user.id);

    console.log('========================================');
    console.log('  FULL PROJECT AUDIT');
    console.log('========================================\n');

    // ==========================================
    // 1. CHANNELS AUDIT
    // ==========================================
    console.log('=== 1. CHANNELS AUDIT ===');
    const allChannels = [...guild.channels.cache.values()];
    const categories = allChannels.filter((c) => c.type === ChannelType.GuildCategory);
    const textChannels = allChannels.filter((c) => c.type === 0 || c.type === 5);
    const voiceChannels = allChannels.filter((c) => c.type === 2);
    const emptyCategories = categories.filter((c) => !allChannels.some((ch) => ch.parentId === c.id));

    console.log(`  Total: ${allChannels.length} (${categories.length} categories, ${textChannels.length} text, ${voiceChannels.length} voice)`);

    // Load games early for cross-category duplicate check
    const games = await Game.findAll({ where: { is_active: true } });

    // Check for empty categories (excluding intentional divisors)
    const divisors = emptyCategories.filter((c) => c.name.includes('═══'));
    const realEmpty = emptyCategories.filter((c) => !c.name.includes('═══'));
    if (divisors.length > 0) {
      ok(`${divisors.length} divisor categories (intentionally empty): ${divisors.map((c) => `"${c.name}"`).join(', ')}`);
    }
    if (realEmpty.length > 0) {
      console.log('\n  Empty categories (no children):');
      for (const cat of realEmpty.sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0))) {
        warn(`Empty category: "${cat.name}" (id:${cat.id}) — consider deleting`);
      }
    } else if (divisors.length === 0) {
      ok('No empty categories');
    }

    // Check for duplicate channel names WITHIN THE SAME CATEGORY (real duplicates)
    // Same name in different game categories is expected (each game has #generale, #news, etc.)
    const parentChildMap = {};
    for (const ch of allChannels) {
      if (ch.type !== 4) {
        const key = `${ch.parentId || 'none'}:${ch.name.toLowerCase()}`;
        if (!parentChildMap[key]) parentChildMap[key] = [];
        parentChildMap[key].push(ch);
      }
    }
    const realDuplicates = Object.entries(parentChildMap).filter(([_, chs]) => chs.length > 1);
    if (realDuplicates.length > 0) {
      console.log('\n  Duplicate channels in same category:');
      for (const [key, chs] of realDuplicates) {
        issue(`Duplicate in same category: "${chs[0].name}" in "${chs[0].parent?.name || 'none'}" — ${chs.length} channels`);
      }
    } else {
      ok('No duplicate channels within same category');
    }

    // Report cross-category same-name channels (expected for game channels)
    const crossCategory = {};
    for (const ch of allChannels) {
      if (ch.type !== 4) {
        const key = ch.name.toLowerCase();
        if (!crossCategory[key]) crossCategory[key] = [];
        crossCategory[key].push(ch);
      }
    }
    const crossDups = Object.entries(crossCategory).filter(([_, chs]) => chs.length > 1);
    const gameChannelDups = crossDups.filter(([name, chs]) => {
      // Check if all are in game categories or Bloods Gilda (expected duplicates)
      const gildaCat = allChannels.find((c) => c.type === 4 && c.name.includes('𝖡𝗅𝗈𝗈𝖽𝗌 𝖦𝗂𝗅𝖽𝖺'));
      return chs.every((ch) =>
        games.some((g) => g.category_id === ch.parentId) ||
        (gildaCat && ch.parentId === gildaCat.id)
      );
    });
    const nonGameDups = crossDups.filter(([name, chs]) => !gameChannelDups.some(([n]) => n === name));
    if (gameChannelDups.length > 0) {
      ok(`${gameChannelDups.length} channel names shared across game categories (expected)`);
    }
    if (nonGameDups.length > 0) {
      console.log('\n  Non-game duplicate channel names:');
      for (const [name, chs] of nonGameDups) {
        warn(`Duplicate "${name}": ${chs.length} channels — ${chs.map((c) => `parent:${c.parent?.name || 'none'}`).join(', ')}`);
      }
    }

    // Check game categories have correct channels
    console.log('\n  Game categories channel check:');
    const expectedChannels = ['💬', '📰', '📣', '⚔️', '🔊', '🔊']; // emoji prefixes
    for (const game of games) {
      if (!game.category_id) {
        issue(`${game.name}: no category_id in DB`);
        continue;
      }
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) {
        issue(`${game.name}: category ${game.category_id} not found in Discord`);
        continue;
      }
      const children = allChannels.filter((c) => c.parentId === cat.id);
      if (children.length !== 6) {
        warn(`${game.name}: has ${children.length} channels (expected 6)`);
      }
      // Check each channel has the right emoji prefix
      const hasGenerale = children.some((c) => c.name.includes('💬'));
      const hasNews = children.some((c) => c.name.includes('📰'));
      const hasComunicazioni = children.some((c) => c.name.includes('📣'));
      const hasComposizioni = children.some((c) => c.name.includes('⚔️'));
      const voiceCount = children.filter((c) => c.type === 2).length;
      if (!hasGenerale) issue(`${game.name}: missing 💬 Generale`);
      if (!hasNews) issue(`${game.name}: missing 📰 News`);
      if (!hasComunicazioni) issue(`${game.name}: missing 📣 Comunicazioni`);
      if (!hasComposizioni) issue(`${game.name}: missing ⚔️ Composizioni`);
      if (voiceCount !== 2) warn(`${game.name}: has ${voiceCount} voice channels (expected 2)`);
      if (hasGenerale && hasNews && hasComunicazioni && hasComposizioni && voiceCount === 2) {
        ok(`${game.name}: all 6 channels present with correct format`);
      }
    }

    // ==========================================
    // 2. ROLES AUDIT
    // ==========================================
    console.log('\n=== 2. ROLES AUDIT ===');
    const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);
    console.log(`  Total roles: ${roles.length}`);
    console.log(`  Bot position: ${botMember.roles.highest.position}`);

    // Check game roles
    for (const game of games) {
      if (!game.role_id) {
        issue(`${game.name}: no role_id in DB`);
        continue;
      }
      const role = guild.roles.cache.get(game.role_id);
      if (!role) {
        issue(`${game.name}: role ${game.role_id} not found in Discord`);
      } else if (role.position >= botMember.roles.highest.position) {
        warn(`${game.name}: role "${role.name}" is above bot — cannot assign automatically`);
      } else {
        ok(`${game.name}: role "${role.name}" (pos:${role.position}, members:${role.members.size})`);
      }
    }

    // Check Muted role
    const mutedRole = guild.roles.cache.find((r) => r.name === 'Muted');
    if (!mutedRole) {
      issue('Muted role not found');
    } else {
      ok(`Muted role: "${mutedRole.name}" (pos:${mutedRole.position})`);
      // Check if Muted has SendMessages denied in categories
      let deniedInCats = 0;
      for (const cat of categories) {
        const ow = cat.permissionOverwrites?.cache.get(mutedRole.id);
        if (ow && ow.deny.has(PermissionsBitField.Flags.SendMessages)) deniedInCats++;
      }
      if (deniedInCats < categories.length * 0.5) {
        warn(`Muted role denied in only ${deniedInCats}/${categories.length} categories`);
      } else {
        ok(`Muted role denied in ${deniedInCats}/${categories.length} categories`);
      }
    }

    // Check reward roles
    const rewardRoles = ['Giocatore Attivo', 'Veterano', 'Leggenda'];
    for (const name of rewardRoles) {
      const role = guild.roles.cache.find((r) => r.name === name);
      if (!role) {
        issue(`Reward role "${name}" not found`);
      } else if (role.position >= botMember.roles.highest.position) {
        warn(`Reward role "${name}" is above bot — cannot assign`);
      } else {
        ok(`Reward role "${name}" (pos:${role.position}, members:${role.members.size})`);
      }
    }

    // ==========================================
    // 3. DB CONSISTENCY AUDIT
    // ==========================================
    console.log('\n=== 3. DB CONSISTENCY ===');

    // Guild settings
    const guildRow = await Guild.findOne({ where: { guild_id: GUILD_ID } });
    if (!guildRow) {
      issue('No guild row in DB');
    } else {
      const checks = [
        ['welcome_enabled', guildRow.welcome_enabled, true],
        ['welcome_channel_id', guildRow.welcome_channel_id, null],
        ['welcome_image_enabled', guildRow.welcome_image_enabled, true],
        ['auto_role_id', guildRow.auto_role_id, null],
        ['automod_enabled', guildRow.automod_enabled, true],
        ['automod_log_channel_id', guildRow.automod_log_channel_id, null],
        ['log_channel_id', guildRow.log_channel_id, null],
        ['level_reward_channel_id', guildRow.level_reward_channel_id, null],
        ['xp_enabled', guildRow.xp_enabled, true],
      ];
      for (const [name, val, expected] of checks) {
        if (expected === null) {
          if (!val) {
            issue(`Guild setting ${name} is NOT SET`);
          } else {
            // Verify channel exists
            if (name.includes('channel_id')) {
              const ch = guild.channels.cache.get(val);
              if (!ch) issue(`Guild setting ${name} → channel ${val} NOT FOUND in Discord`);
              else ok(`Guild setting ${name} → #${ch.name}`);
            } else if (name === 'auto_role_id') {
              const role = guild.roles.cache.get(val);
              if (!role) issue(`Guild setting ${name} → role ${val} NOT FOUND`);
              else ok(`Guild setting ${name} → "${role.name}"`);
            } else {
              ok(`Guild setting ${name} = ${val}`);
            }
          }
        } else {
          if (val !== expected) warn(`Guild setting ${name} = ${val} (expected ${expected})`);
          else ok(`Guild setting ${name} = ${val}`);
        }
      }
    }

    // Games consistency
    console.log('\n  Games:');
    for (const game of games) {
      const metaCount = await GameMeta.count({ where: { game_id: game.id } });
      const unpostedCount = await GameMeta.count({ where: { game_id: game.id, posted_to_channel: false } });
      const role = game.role_id ? guild.roles.cache.get(game.role_id) : null;
      const cat = game.category_id ? guild.channels.cache.get(game.category_id) : null;

      if (!role) issue(`${game.name}: role missing in Discord`);
      if (!cat) issue(`${game.name}: category missing in Discord`);
      if (unpostedCount > 0) warn(`${game.name}: ${unpostedCount} unposted meta entries`);

      ok(`${game.name}: role=${role ? '✓' : '✗'} cat=${cat ? '✓' : '✗'} meta=${metaCount} unposted=${unpostedCount}`);
    }

    // Level rewards
    console.log('\n  Level rewards:');
    const rewards = await LevelReward.findAll({ where: { guild_id: GUILD_ID } });
    if (rewards.length === 0) {
      warn('No level rewards configured');
    } else {
      for (const r of rewards) {
        const role = guild.roles.cache.get(r.role_id);
        if (!role) issue(`Level ${r.level}: role ${r.role_id} not found`);
        else ok(`Level ${r.level} → "${role.name}" (pos:${role.position})`);
      }
    }

    // Automod rules
    console.log('\n  Automod rules:');
    const rules = await AutomodRule.findAll({ where: { guild_id: GUILD_ID } });
    if (rules.length === 0) {
      warn('No automod rules configured');
    } else {
      for (const r of rules) {
        ok(`Rule ${r.rule_type}: enabled=${r.is_enabled} action=${r.action}`);
      }
    }

    // Discord logs count
    const logCount = await DiscordLog.count({ where: { guild_id: GUILD_ID } });
    ok(`Discord logs: ${logCount} entries`);

    // Users count
    const userCount = await User.count({ where: { guild_id: GUILD_ID } });
    ok(`Users in DB: ${userCount}`);

    // Audit logs count
    const auditCount = await AuditLog.count({ where: { guild_id: GUILD_ID } });
    ok(`Audit logs: ${auditCount} entries`);

    // ==========================================
    // 4. SERVICES AUDIT (via health endpoint)
    // ==========================================
    console.log('\n=== 4. SERVICES ===');
    const http = require('http');
    const healthData = await new Promise((resolve) => {
      http.get('http://127.0.0.1:3000/health', (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { resolve(null); }
        });
      }).on('error', () => resolve(null));
    });
    if (healthData) {
      ok(`Health check: status=${healthData.status || 'ok'}, uptime=${Math.floor((healthData.uptime || 0) / 60)}min`);
      if (healthData.services) {
        for (const [name, running] of Object.entries(healthData.services)) {
          if (running) ok(`Service ${name}: running`);
          else issue(`Service ${name}: NOT running`);
        }
      }
    } else {
      // Fallback: check via PM2 logs
      const { execSync } = require('child_process');
      try {
        const logs = execSync('pm2 logs bloods-hub-bot --lines 30 --nostream 2>&1', { encoding: 'utf-8' });
        const services = ['ActivityTracker', 'LeaderboardScheduler', 'MetaScheduler', 'NewsPoster', 'CleanupScheduler', 'StatRefreshScheduler'];
        for (const svc of services) {
          if (logs.includes(svc + ' started')) ok(`${svc}: started`);
          else issue(`${svc}: NOT started`);
        }
        const cmdMatch = logs.match(/Loaded (\d+) slash commands/);
        if (cmdMatch) ok(`${cmdMatch[1]} slash commands loaded`);
        else issue('Cannot determine command count');
      } catch (e) {
        warn('Cannot verify services via PM2 logs');
      }
    }

    // ==========================================
    // 5. COMMANDS AUDIT (from files)
    // ==========================================
    console.log('\n=== 5. COMMANDS ===');
    const fs = require('fs');
    const path = require('path');
    const commandsDir = path.join(__dirname, '..', 'src', 'commands');
    let cmdCount = 0;
    function scanCommands(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanCommands(fullPath);
        } else if (entry.name.endsWith('.js')) {
          cmdCount++;
          try {
            const cmd = require(fullPath);
            if (!cmd.data) issue(`Command ${entry.name}: missing data`);
            if (!cmd.execute) issue(`Command ${entry.name}: missing execute`);
          } catch (e) {
            issue(`Command ${entry.name}: load error: ${e.message.substring(0, 60)}`);
          }
        }
      }
    }
    scanCommands(commandsDir);
    ok(`${cmdCount} command files found and validated`);

    // ==========================================
    // 6. PERMISSIONS AUDIT (game channels)
    // ==========================================
    console.log('\n=== 6. CHANNEL PERMISSIONS ===');
    for (const game of games) {
      if (!game.category_id || !game.role_id) continue;
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) continue;

      // Check @everyone is denied ViewChannel
      const everyoneOW = cat.permissionOverwrites?.cache.get(guild.roles.everyone.id);
      if (!everyoneOW || !everyoneOW.deny.has(PermissionsBitField.Flags.ViewChannel)) {
        issue(`${game.name}: @everyone can see category`);
      }

      // Check game role can view
      const roleOW = cat.permissionOverwrites?.cache.get(game.role_id);
      if (!roleOW || !roleOW.allow.has(PermissionsBitField.Flags.ViewChannel)) {
        issue(`${game.name}: game role cannot view category`);
      }

      // Check news channel is read-only for game role
      const children = allChannels.filter((c) => c.parentId === cat.id);
      const newsCh = children.find((c) => c.name.includes('📰'));
      if (newsCh) {
        const newsRoleOW = newsCh.permissionOverwrites?.cache.get(game.role_id);
        if (newsRoleOW && newsRoleOW.deny.has(PermissionsBitField.Flags.SendMessages)) {
          ok(`${game.name}: news channel is read-only for game role`);
        } else if (!newsRoleOW) {
          // Inherits from category — check if category denies SendMessages
          // For readonly_text, the channel-level overwrite should deny SendMessages
          warn(`${game.name}: news channel has no explicit role overwrite (inherits category)`);
        } else {
          issue(`${game.name}: news channel allows SendMessages for game role`);
        }
      }
    }

    // ==========================================
    // 7. NEWS CHANNEL CONTENT
    // ==========================================
    console.log('\n=== 7. NEWS CHANNEL CONTENT ===');
    for (const game of games) {
      if (!game.category_id) continue;
      const cat = guild.channels.cache.get(game.category_id);
      if (!cat) continue;
      const newsCh = allChannels.find((c) => c.parentId === cat.id && c.name.includes('📰'));
      if (!newsCh) {
        issue(`${game.name}: no news channel found`);
        continue;
      }
      try {
        const messages = await newsCh.messages.fetch({ limit: 10 });
        if (messages.size === 0) {
          warn(`${game.name}: news channel is empty`);
        } else {
          const botMsgs = messages.filter((m) => m.author.id === client.user.id);
          ok(`${game.name}: ${messages.size} messages (${botMsgs.size} from bot) in #${newsCh.name}`);
        }
      } catch (e) {
        warn(`${game.name}: cannot fetch messages from news channel`);
      }
    }

    // ==========================================
    // 8. ROLE SELECTION PANEL
    // ==========================================
    console.log('\n=== 8. ROLE SELECTION PANEL ===');
    if (guildRow?.role_selection_channel_id) {
      const ch = guild.channels.cache.get(guildRow.role_selection_channel_id);
      if (!ch) {
        issue('Role selection channel not found in Discord');
      } else {
        const messages = await ch.messages.fetch({ limit: 5 });
        const panel = messages.first();
        if (!panel) {
          issue('Role selection panel message not found');
        } else if (panel.author.id !== client.user.id) {
          issue('Role selection panel not posted by bot');
        } else {
          // Check all games are in the select menu
          let menuOptions = [];
          for (const row of panel.components) {
            for (const comp of row.components) {
              if (comp.data?.type === 3) {
                menuOptions = comp.data.options || [];
              }
            }
          }
          const menuCodes = menuOptions.map((o) => o.value);
          const dbCodes = games.map((g) => g.code);
          const missingInMenu = dbCodes.filter((c) => !menuCodes.includes(c));
          const missingInDB = menuCodes.filter((c) => !dbCodes.includes(c));
          if (missingInMenu.length > 0) issue(`Games in DB but not in panel: ${missingInMenu.join(', ')}`);
          if (missingInDB.length > 0) issue(`Games in panel but not in DB: ${missingInDB.join(', ')}`);
          if (missingInMenu.length === 0 && missingInDB.length === 0) {
            ok(`Panel has all ${games.length} games in select menu`);
          }
        }
      }
    } else {
      issue('role_selection_channel_id not set in DB');
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log('  AUDIT SUMMARY');
    console.log('========================================');
    console.log(`  Issues:   ${issues.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    if (issues.length > 0) {
      console.log('\n  ISSUES TO FIX:');
      issues.forEach((i, idx) => console.log(`    ${idx + 1}. ${i}`));
    }
    if (warnings.length > 0) {
      console.log('\n  WARNINGS (non-critical):');
      warnings.forEach((w, idx) => console.log(`    ${idx + 1}. ${w}`));
    }
    if (issues.length === 0 && warnings.length === 0) {
      console.log('\n  ✓ EVERYTHING IS COHERENT — NO ISSUES FOUND');
    }

    process.exit(issues.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('Audit failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
