// scripts/setup_discord.js
// Configures the Discord server through the bot:
// 1. Creates Muted role + denies permissions in all channels
// 2. Creates reward roles (Veterano, Leggenda)
// 3. Configures missing channel IDs in DB
// 4. Enables welcome + automod
// 5. Creates default automod rules
// 6. Creates level rewards
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../src/config');
const { Guild, LevelReward, AutomodRule } = require('../src/db');

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
    await guild.fetch();
    await guild.roles.fetch();
    await guild.channels.fetch();
    const botMember = await guild.members.fetch(client.user.id);
    const botPos = botMember.roles.highest.position;
    console.log(`Bot position: ${botPos}`);

    // ==========================================
    // 1. CREATE MUTED ROLE
    // ==========================================
    console.log('\n=== 1. MUTED ROLE ===');
    let mutedRole = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === 'muted' || r.name.toLowerCase() === 'mutato' || r.name.toLowerCase() === 'silenzioso'
    );
    if (mutedRole) {
      console.log(`  Already exists: "${mutedRole.name}" (id:${mutedRole.id}) pos:${mutedRole.position}`);
    } else {
      console.log('  Creating Muted role...');
      mutedRole = await guild.roles.create({
        name: 'Muted',
        color: '#555555',
        permissions: [], // No permissions
        position: Math.max(1, botPos - 1), // Just below bot
        reason: 'Bloods Bot setup — Muted role for automod/moderation',
      });
      console.log(`  ✓ Created: "${mutedRole.name}" (id:${mutedRole.id}) pos:${mutedRole.position}`);
    }

    // Deny SendMessages + Speak + AddReactions for Muted in all channels
    console.log('  Denying SendMessages/Speak/AddReactions in all channels...');
    let deniedCount = 0;
    for (const ch of guild.channels.cache.values()) {
      if (ch.type === ChannelType.GuildCategory) {
        // Set on category — children inherit
        try {
          await ch.permissionOverwrites.edit(mutedRole, {
            SendMessages: false,
            Speak: false,
            AddReactions: false,
            CreatePublicThreads: false,
            CreatePrivateThreads: false,
            SendMessagesInThreads: false,
          }, { reason: 'Muted role setup' });
          deniedCount++;
        } catch (e) { /* skip */ }
      } else if (ch.type === 0 || ch.type === 5 || ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
        // Text channel without parent (or override needed)
        if (!ch.parent) {
          try {
            await ch.permissionOverwrites.edit(mutedRole, {
              SendMessages: false,
              AddReactions: false,
              CreatePublicThreads: false,
              SendMessagesInThreads: false,
            }, { reason: 'Muted role setup' });
            deniedCount++;
          } catch (e) { /* skip */ }
        }
      } else if (ch.type === 2 || ch.type === ChannelType.GuildVoice) {
        if (!ch.parent) {
          try {
            await ch.permissionOverwrites.edit(mutedRole, {
              Speak: false,
            }, { reason: 'Muted role setup' });
            deniedCount++;
          } catch (e) { /* skip */ }
        }
      }
    }
    console.log(`  ✓ Denied permissions in ${deniedCount} channels/categories`);

    // ==========================================
    // 2. CREATE REWARD ROLES
    // ==========================================
    console.log('\n=== 2. REWARD ROLES ===');
    const rewardRoles = [
      { name: 'Giocatore Attivo', color: '#2ecc71', level: 5 },
      { name: 'Veterano', color: '#9b59b6', level: 10 },
      { name: 'Leggenda', color: '#f1c40f', level: 25 },
    ];
    const createdRoles = {};
    for (const rr of rewardRoles) {
      let role = guild.roles.cache.find((r) => r.name === rr.name);
      if (role) {
        console.log(`  Already exists: "${role.name}" (id:${role.id}) pos:${role.position}`);
      } else {
        console.log(`  Creating role "${rr.name}"...`);
        role = await guild.roles.create({
          name: rr.name,
          color: rr.color,
          permissions: [],
          position: Math.max(1, botPos - 2), // Below bot and Muted
          reason: `Bloods Bot setup — Level ${rr.level} reward`,
        });
        console.log(`  ✓ Created: "${role.name}" (id:${role.id}) pos:${role.position}`);
      }
      createdRoles[rr.level] = role.id;
    }

    // ==========================================
    // 3. CONFIGURE CHANNEL IDs IN DB
    // ==========================================
    console.log('\n=== 3. DB CHANNEL CONFIG ===');
    const channelMap = {};
    for (const ch of guild.channels.cache.values()) {
      if (ch.name) channelMap[ch.name] = ch.id;
    }

    // Find suitable channels
    const logChannel = guild.channels.cache.get('1459341780607700992') || // mod_log_channel_id
      guild.channels.cache.find((c) => c.name.includes('Log-Bot') || c.name.includes('log-bot'));
    const announcementsChannel = guild.channels.cache.find((c) => c.name.includes('annunci') || c.name.includes('𝔞𝔫𝔫𝔲𝔫𝔠𝔦'));
    const generalChat = guild.channels.cache.find((c) => c.name.includes('Chat-Pubblica') || c.name.includes('chat-generale') || c.name.includes('Comunicazioni'));

    const updates = {};
    // log_channel_id — use the existing mod-log channel
    if (logChannel) {
      updates.log_channel_id = logChannel.id;
      console.log(`  log_channel_id → #${logChannel.name} (${logChannel.id})`);
    }
    // automod_log_channel_id — same as log
    if (logChannel) {
      updates.automod_log_channel_id = logChannel.id;
      console.log(`  automod_log_channel_id → #${logChannel.name} (${logChannel.id})`);
    }
    // announcements_channel_id
    if (announcementsChannel) {
      updates.announcements_channel_id = announcementsChannel.id;
      console.log(`  announcements_channel_id → #${announcementsChannel.name} (${announcementsChannel.id})`);
    } else {
      console.log('  ⚠ announcements_channel_id: no suitable channel found');
    }
    // level_reward_channel_id — use general chat or announcements
    const rewardChannel = generalChat || announcementsChannel || logChannel;
    if (rewardChannel) {
      updates.level_reward_channel_id = rewardChannel.id;
      console.log(`  level_reward_channel_id → #${rewardChannel.name} (${rewardChannel.id})`);
    }

    // Enable welcome + automod
    updates.welcome_enabled = true;
    updates.welcome_image_enabled = true;
    updates.welcome_message = 'Benvenuto {user} in **{server}**! 🎮 Sei il membro #{count}. Vai in <#1529506938654818466> per scegliere i tuoi giochi!';
    updates.automod_enabled = true;

    // Auto-role: "Membro della community"
    const memberRole = guild.roles.cache.find((r) => r.name === 'Membro della community');
    if (memberRole && memberRole.position < botPos) {
      updates.auto_role_id = memberRole.id;
      console.log(`  auto_role_id → "${memberRole.name}" (${memberRole.id})`);
    } else if (memberRole) {
      console.log(`  ⚠ auto_role_id: "Membro della community" is above bot — cannot auto-assign`);
    } else {
      console.log('  ⚠ auto_role_id: "Membro della community" role not found');
    }

    // Apply updates
    const [guildRow] = await Guild.findOrCreate({
      where: { guild_id: GUILD_ID },
      defaults: { guild_id: GUILD_ID, name: guild.name },
    });
    await guildRow.update(updates);
    console.log('  ✓ DB updated');

    // ==========================================
    // 4. CREATE LEVEL REWARDS
    // ==========================================
    console.log('\n=== 4. LEVEL REWARDS ===');
    for (const rr of rewardRoles) {
      const roleId = createdRoles[rr.level];
      if (!roleId) continue;
      // Check if already exists
      const existing = await LevelReward.findOne({
        where: { guild_id: GUILD_ID, level: rr.level },
      });
      if (existing) {
        console.log(`  Already exists: Level ${rr.level} → "${rr.name}"`);
        continue;
      }
      await LevelReward.create({
        guild_id: GUILD_ID,
        level: rr.level,
        role_id: roleId,
        message: `🎉 {user} ha raggiunto il livello **{level}** e ha ottenuto il ruolo **${rr.name}**!`,
      });
      console.log(`  ✓ Level ${rr.level} → role "${rr.name}" (${roleId})`);
    }

    // ==========================================
    // 5. CREATE DEFAULT AUTOMOD RULES
    // ==========================================
    console.log('\n=== 5. AUTOMOD RULES ===');
    const defaultRules = [
      {
        rule_type: 'link',
        action: 'warn',
        threshold: null,
        words: null,
      },
      {
        rule_type: 'spam',
        action: 'delete',
        threshold: 5,
        words: null,
      },
      {
        rule_type: 'mention_spam',
        action: 'warn',
        threshold: 5,
        words: null,
      },
      {
        rule_type: 'caps',
        action: 'delete',
        threshold: 70,
        words: null,
      },
    ];

    for (const dr of defaultRules) {
      const existing = await AutomodRule.findOne({
        where: { guild_id: GUILD_ID, rule_type: dr.rule_type },
      });
      if (existing) {
        console.log(`  Already exists: ${dr.rule_type} (enabled: ${existing.is_enabled})`);
        continue;
      }
      await AutomodRule.create({
        guild_id: GUILD_ID,
        rule_type: dr.rule_type,
        is_enabled: true,
        threshold: dr.threshold,
        words: dr.words,
        action: dr.action,
        mute_duration: null,
        exempt_roles: [memberRole?.id].filter(Boolean),
      });
      console.log(`  ✓ Created: ${dr.rule_type} → action: ${dr.action}`);
    }

    // ==========================================
    // 6. FINAL SUMMARY
    // ==========================================
    console.log('\n=== SETUP COMPLETE ===');
    console.log(`  Muted role: ${mutedRole ? '✓ ' + mutedRole.id : '✗'}`);
    console.log(`  Reward roles: ${Object.entries(createdRoles).map(([l, id]) => `Lv${l}=${id}`).join(', ')}`);
    console.log(`  Welcome: ${updates.welcome_enabled ? '✓ enabled' : '✗'}`);
    console.log(`  Automod: ${updates.automod_enabled ? '✓ enabled' : '✗'}`);
    console.log(`  Auto-role: ${updates.auto_role_id ? '✓ ' + updates.auto_role_id : '⚠ not set'}`);
    console.log(`  Log channel: ${updates.log_channel_id ? '✓' : '✗'}`);
    console.log(`  Automod log: ${updates.automod_log_channel_id ? '✓' : '✗'}`);
    console.log(`  Level reward channel: ${updates.level_reward_channel_id ? '✓' : '✗'}`);
    console.log(`  Announcements: ${updates.announcements_channel_id ? '✓' : '⚠ not set'}`);

    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
});

client.login(config.discord.token);
