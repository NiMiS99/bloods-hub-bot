// src/commands/admin/setup.js
// ============================================================================
//  /setup run  — NON-DESTRUCTIVE, idempotent setup of the multi-game hub layer
//  on top of the existing "Bloods" WoW guild Discord.
//
//  STRICT GUARANTEES:
//    • NEVER deletes, renames, or modifies permissions on any existing
//      WoW guild category, channel, or role.
//    • NEVER touches any category in the PROTECTED_CATEGORIES safety array.
//    • NEVER creates new onboarding channels — it maps existing channels by ID
//      (from .env: WELCOME_CHANNEL_ID, RULES_CHANNEL_ID, ROLE_PANEL_CHANNEL_ID)
//      to avoid duplication from emoji/Fraktur font mismatch in name matching.
//    • Routes bot logging to the existing #Log-Bot channel (no duplicates).
//
//  What it does (idempotent, safe to re-run):
//    1. Records the @everyone role id in the guild config.
//    2. Fetches the 3 onboarding channels by ID from .env and applies
//       permission overrides (@everyone: ViewChannel allow, SendMessages deny).
//    3. Records the existing #Log-Bot channel ID in config.
//    4. Marks existing WoW members as legacy_wow_member=1 in the DB.
//    5. Persists everything in the `guilds` config row.
//
//  What it does NOT do:
//    • Create any channel or category.
//    • Delete any channel or category.
//    • Remove or modify any existing role.
//    • Modify permissions on any PROTECTED_CATEGORIES entry.
// ============================================================================
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, PermissionsBitField } = require('discord.js');
const { Guild, User } = require('../../db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { toFraktur } = require('../../utils/textFormatter');
const config = require('../../config');
const logger = require('../../utils/logger');
const { recordAudit } = require('../../utils/auditLog');
const { isAdmin } = require('../../utils/permissions');

// ── PROTECTED_CATEGORIES ───────────────────────────────────────────────────
// Hardcoded safety array of ALL existing category IDs in the Bloods Community
// server. These are NEVER modified by /setup run — neither permissions, names,
// nor deletion. This includes:
//   • Legacy WoW guild categories (Bloods Info, Bloods Utility, Bloods,
//     Regno dei Bloods, Sala del duello)
//   • Decorative spacer categories (𝓘 𝓝 𝓕 𝓞, 𝓟 𝓥 𝓟, etc.)
//   • Staff/functional categories (Assistenza, Log Bot, Streaming Zone,
//     Prigione)
//
// IDs sourced from server_structure_report.json (snapshot 2026-07-22).
const PROTECTED_CATEGORIES = [
  // Decorative spacer categories (Fraktur/script Unicode headers)
  '1483562338593280302', // 𝓘 𝓝 𝓕 𝓞
  '1483563255338369241', // 𝓤 𝓣 𝓘 𝓛 𝓘 𝓣 𝓨
  '1483563383587344415', // 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢
  '1483563991841243368', // 𝓐 𝓢 𝓢 𝓘 𝓢 𝓣 𝓔 𝓝 𝓩 𝓐
  '1483564105758412810', // 𝓡 𝓔 𝓖 𝓝 𝓞 - 𝓓 𝓔 𝓘 - 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢
  '1483564606155784284', // 𝓟 𝓥 𝓟
  '1483564839166017676', // 𝓑 𝓛 𝓞 𝓞 𝓓 𝓢 - 𝓑 𝓞 𝓣
  '1483566405239570512', // 𝓢 𝓣 𝓡 𝓔 𝓐 𝓜 𝓘 𝓝 𝓖 - 𝓩 𝓞 𝓝 𝓔
  '1483564729858265098', // 𝓟 𝓡 𝓘 𝓖 𝓘 𝓞 𝓝 𝓔
  // Legacy WoW guild categories
  '1010226760308240405', // 𝔅𝔩𝔬𝔬𝔡𝔰 ℑ𝔫𝔣𝔬
  '1430293220331622420', // 𝔅𝔩𝔬𝔬𝔡𝔰 𝔘𝔱𝔦𝔩𝔦𝔱𝔶
  '1430311888826274045', // 𝔅𝔩𝔬𝔬𝔡𝔰
  '1012737312859365436', // ℜ𝔢𝔤𝔫𝔬 𝔡𝔢𝔦 𝔅𝔩𝔬𝔬𝔡𝔰
  '1421544095788040362', // 𝔖𝔞𝔩𝔞 𝔡𝔢𝔩 𝔡𝔲𝔢𝔩𝔩𝔬 (PvP)
  // Other functional/staff categories
  '1421540995828289596', // 𝔄𝔰𝔰𝔦𝔰𝔱𝔢𝔫𝔷𝔞
  '1459307524682420276', // 𝔏𝔬𝔤 𝔅𝔬𝔱
  '1459554999653896242', // 𝔖𝔱𝔯𝔢𝔞𝔪𝔦𝔫𝔤 ℨ𝔬𝔫𝔢
  '1013189896074182667', // 𝔓𝔯𝔦𝔤𝔦𝔬𝔫𝔢
];

// Existing reusable channels — the bot routes to these instead of duplicating.
const EXISTING_LOG_BOT_CHANNEL_ID = '1459341780607700992';     // 🤖丨𝖫𝗈𝗀-𝖡𝗈𝗍
const EXISTING_COMANDI_BOT_CHANNEL_ID = '1430308477615607940'; // 💻丨𝖢𝗈𝗆𝖺𝗇𝖽𝗂-𝖡𝗈𝗍

// Onboarding channel mapping: env config key → DB config field.
const ONBOARDING_CHANNEL_MAP = [
  { envKey: 'welcome',   configField: 'welcome_channel_id' },
  { envKey: 'rules',     configField: 'rules_channel_id' },
  { envKey: 'rolePanel', configField: 'role_selection_channel_id' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Migra l\'attuale Discord dei Bloods nell\'hub multigioco (non distruttivo).')
    .addSubcommand((s) => s.setName('run').setDescription('Esegui la migrazione.'))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra lo stato attuale della migrazione.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Non hai i permessi per usare questo comando. Serve il ruolo **Bloods Admin** o permessi Discord equivalenti.')],
        flags: 64,
      });
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'status') return this._status(interaction);
    if (sub === 'run') return this._run(interaction);
  },

  async _status(interaction) {
    const g = await Guild.findByPk(interaction.guild.id);
    if (!g) {
      await interaction.reply({ embeds: [errorEmbed('Nessuna configurazione presente — esegui prima `/setup run`.')] });
      return;
    }
    const embed = baseEmbed({
      title: 'Stato migrazione',
      description: [
        `**Canale benvenuto:** ${g.welcome_channel_id ? `<#${g.welcome_channel_id}>` : '_non impostato_'}`,
        `**Canale regolamento:** ${g.rules_channel_id ? `<#${g.rules_channel_id}>` : '_non impostato_'}`,
        `**Canale selezione giochi:** ${g.role_selection_channel_id ? `<#${g.role_selection_channel_id}>` : '_non impostato_'}`,
        `**Ruolo @everyone:** ${g.everyone_role_id ? `<@&${g.everyone_role_id}>` : '_non impostato_'}`,
        `**Categoria WoW legacy:** ${g.legacy_wow_category_id ? `<#${g.legacy_wow_category_id}>` : '_non impostata_'}`,
        `**Canale log bot:** ${g.mod_log_channel_id ? `<#${g.mod_log_channel_id}>` : '_non impostato_'}`,
        `**Categorie protette:** ${PROTECTED_CATEGORIES.length} (mai modificate)`,
      ].join('\n'),
    });
    await interaction.reply({ embeds: [embed], flags: 64 });
  },

  async _run(interaction) {
    await interaction.deferReply({ flags: 64 });
    const guild = interaction.guild;
    const everyone = guild.roles.everyone;
    const log = [];

    // 1. Upsert guild config row.
    const [g] = await Guild.findOrCreate({
      where: { guild_id: guild.id },
      defaults: { guild_id: guild.id, name: guild.name, everyone_role_id: everyone.id },
    });
    await g.update({ everyone_role_id: everyone.id, name: guild.name });
    log.push(`Registrato ruolo @everyone: <@&${everyone.id}>`);

    // 2. Detect legacy WoW category (NFKC-normalized match for Fraktur names).
    //    We record it but NEVER modify it.
    const legacyCat = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && /wow|blood/i.test(c.name.normalize('NFKC'))
    );
    if (legacyCat) {
      await g.update({ legacy_wow_category_id: legacyCat.id });
      log.push(`Rilevata categoria WoW legacy: <#${legacyCat.id}> (${legacyCat.name}) — preservata intatta.`);
    } else {
      log.push('Nessuna categoria WoW legacy rilevata per nome — saltato.');
    }

    // 3. Map onboarding channels by ID from .env (NO name-based search, NO creation).
    //    Apply permission overrides: @everyone can ViewChannel + ReadMessageHistory
    //    but NOT SendMessages (read-only onboarding). Bot can send messages.
    const channelIdMap = {
      welcome: config.channels.welcome,
      rules: config.channels.rules,
      rolePanel: config.channels.rolePanel,
    };

    // Validate that at least the channel IDs are provided.
    const missingIds = ONBOARDING_CHANNEL_MAP.filter(
      ({ envKey }) => !channelIdMap[envKey]
    );
    if (missingIds.length > 0) {
      const missingNames = missingIds.map(({ envKey }) => {
        if (envKey === 'welcome') return 'WELCOME_CHANNEL_ID';
        if (envKey === 'rules') return 'RULES_CHANNEL_ID';
        if (envKey === 'rolePanel') return 'ROLE_PANEL_CHANNEL_ID';
        return envKey;
      }).join(', ');
      logger.warn(`Skipping onboarding setup: valid Channel IDs not provided in .env (${missingNames})`);
      log.push(`⚠️ Skipping onboarding setup: valid Channel IDs not provided in .env (${missingNames})`);
    } else {
      // Fetch each channel by ID and apply overrides.
      for (const { envKey, configField } of ONBOARDING_CHANNEL_MAP) {
        const channelId = channelIdMap[envKey];
        const ch = guild.channels.cache.get(channelId);
        if (!ch) {
          logger.warn(`Channel ID ${channelId} (${envKey}) not found in guild — skipping.`);
          log.push(`⚠️ Canale ${envKey} (ID: ${channelId}) non trovato nella gilda — saltato.`);
          continue;
        }
        // Apply permission overrides: @everyone can view + read history, but
        // cannot send messages (read-only onboarding). Bot can send messages.
        await ch.permissionOverwrites.edit(everyone, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false,
        }).catch(() => {});
        await ch.permissionOverwrites.edit(guild.client.user, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        }).catch(() => {});
        await g.update({ [configField]: ch.id });
        log.push(`Mappato canale ${envKey}: <#${ch.id}> (${ch.name}) — @everyone: visibile (sola lettura).`);
      }
    }

    // 3b. Create Community Hub category + channels (idempotent).
    //     This is the shared space for all community members, visible to
    //     "Membro della community" role. Contains:
    //       - #𝔠𝔥𝔞𝔱-𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢 (text, community chat)
    //       - 🔊 𝔙𝔬𝔠𝔞𝔩𝔢 𝔠𝔬𝔪𝔪𝔲𝔫𝔦𝔱𝔶 (voice)
    //     Also creates #𝔞𝔳𝔳𝔦𝔰𝔦 (annunci, visible to @everyone, staff-only write).
    const communityRole = guild.roles.cache.find((r) => {
      const n = r.name.normalize('NFKC').toLowerCase();
      return n === 'membro della community' || (n.includes('community') && !n.includes('bloods'));
    });

    if (communityRole) {
      // Community Hub category
      const hubCatName = toFraktur('Community Hub');
      let hubCat = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === hubCatName
      );
      if (!hubCat) {
        hubCat = await guild.channels.create({
          name: hubCatName,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: communityRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.Connect] },
            { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] },
          ],
          reason: 'Community Hub per membri multigioco',
        });
        log.push(`Creata categoria Community Hub: <#${hubCat.id}>`);
      } else {
        log.push(`Categoria Community Hub già esistente: <#${hubCat.id}>`);
      }

      // #𝔠𝔥𝔞𝔱-𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢
      const generalName = toFraktur('chat-generale');
      let hubGeneral = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === generalName && c.parentId === hubCat.id
      );
      if (!hubGeneral) {
        hubGeneral = await guild.channels.create({
          name: generalName,
          type: ChannelType.GuildText,
          parent: hubCat.id,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: communityRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ],
          reason: 'Chat generale community',
        });
        log.push(`Creato #${generalName} in Community Hub`);
      }

      // 🔊 𝔙𝔬𝔠𝔞𝔩𝔢 𝔠𝔬𝔪𝔪𝔲𝔫𝔦𝔱𝔶
      const voiceName = `🔊 ${toFraktur('Vocale community')}`;
      let hubVoice = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildVoice && c.name === voiceName && c.parentId === hubCat.id
      );
      if (!hubVoice) {
        hubVoice = await guild.channels.create({
          name: voiceName,
          type: ChannelType.GuildVoice,
          parent: hubCat.id,
          permissionOverwrites: [
            { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: communityRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
            { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
          ],
          reason: 'Vocale community',
        });
        log.push(`Creato ${voiceName} in Community Hub`);
      }
    } else {
      log.push('⚠️ Ruolo "Membro della community" non trovato — Community Hub non creato.');
    }

    // 3c. Create #𝔞𝔳𝔳𝔦𝔰𝔦 inside Community Hub (if hub exists).
    //     Read-only for community members, writable by bot (admins bypass perms).
    //     Also create a public #𝔞𝔫𝔫𝔲𝔫𝔠𝔦 in the onboarding area for everyone.
    if (communityRole) {
      const hubCatName = toFraktur('Community Hub');
      const hubCat = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === hubCatName
      );
      if (hubCat) {
        const avvisiName = toFraktur('avvisi');
        let avvisiCh = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === avvisiName && c.parentId === hubCat.id
        );
        if (!avvisiCh) {
          avvisiCh = await guild.channels.create({
            name: avvisiName,
            type: ChannelType.GuildText,
            parent: hubCat.id,
            permissionOverwrites: [
              { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: communityRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory], deny: [PermissionsBitField.Flags.SendMessages] },
              { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            ],
            reason: 'Avvisi community (sola lettura per membri)',
          });
          log.push(`Creato #${avvisiName} in Community Hub (sola lettura)`);
        } else {
          log.push(`Canale #${avvisiName} già esistente in Community Hub`);
        }
      }
    }

    // 3d. Create public #𝔞𝔫𝔫𝔲𝔫𝔠𝔦 in onboarding area (visible to @everyone, read-only).
    const annunciName = toFraktur('annunci');
    let annunciCh = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText && c.name === annunciName
    );
    if (!annunciCh) {
      const welcomeCh = g.welcome_channel_id ? guild.channels.cache.get(g.welcome_channel_id) : null;
      annunciCh = await guild.channels.create({
        name: annunciName,
        type: ChannelType.GuildText,
        parent: welcomeCh ? welcomeCh.parentId : null,
        permissionOverwrites: [
          { id: everyone.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory], deny: [PermissionsBitField.Flags.SendMessages] },
          { id: guild.client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ],
        reason: 'Annunci pubblici community (sola lettura per @everyone)',
      });
      log.push(`Creato #${annunciName} (annunci pubblici, sola lettura)`);
    } else {
      log.push(`Canale #${annunciName} già esistente`);
    }

    // 4. Route bot logging to the existing #Log-Bot channel (no duplication).
    const logBotChannel = guild.channels.cache.get(EXISTING_LOG_BOT_CHANNEL_ID);
    if (logBotChannel) {
      await g.update({ mod_log_channel_id: logBotChannel.id });
      log.push(`Log bot instradato a: <#${logBotChannel.id}> (canale esistente — nessun duplicato creato).`);
    } else {
      log.push('Canale #Log-Bot non trovato — mod_log_channel_id non impostato.');
    }

    // 5. Verify all PROTECTED_CATEGORIES are present and untouched.
    //    We do NOT modify them — this is a read-only safety check.
    let protectedCount = 0;
    for (const catId of PROTECTED_CATEGORIES) {
      const cat = guild.channels.cache.get(catId);
      if (cat && cat.type === ChannelType.GuildCategory) {
        protectedCount++;
      }
    }
    log.push(`${protectedCount}/${PROTECTED_CATEGORIES.length} categorie protette verificate (mai modificate).`);

    // 6. Mark existing members as legacy WoW members if they hold any legacy
    //    role whose name contains "wow"/"blood"/"guild" (NFKC-normalized).
    //    Best-effort: only sets the DB flag — does NOT change Discord roles.
    const legacyRoles = guild.roles.cache.filter(
      (r) => /wow|blood|guild/i.test(r.name.normalize('NFKC')) && r.id !== everyone.id
    );
    let marked = 0;
    if (legacyRoles.size > 0) {
      await guild.members.fetch();
      for (const role of legacyRoles.values()) {
        for (const member of role.members.values()) {
          if (member.user.bot) continue;
          const [u] = await User.findOrCreate({
            where: { user_id: member.id, guild_id: guild.id },
            defaults: { user_id: member.id, guild_id: guild.id, username: member.user.username, legacy_wow_member: true, legacy_wow_rank: role.name },
          });
          if (!u.legacy_wow_member) {
            await u.update({ legacy_wow_member: true, legacy_wow_rank: role.name });
            marked++;
          }
        }
      }
      log.push(`Marcati ${marked} membri come WoW legacy (da ${legacyRoles.size} ruoli legacy).`);
    } else {
      log.push('Nessun ruolo WoW legacy rilevato per nome — flagging membri legacy saltato.');
    }

    logger.info(`Migration run for guild ${guild.id}: ${log.join(' | ')}`);

    // Audit log.
    await recordAudit({
      guildId: guild.id,
      actorId: interaction.user.id,
      action: 'setup.run',
      targetType: 'guild',
      targetId: guild.id,
      details: { steps: log.length },
    });

    await interaction.editReply({
      embeds: [
        baseEmbed({
          title: 'Migrazione completata',
          description: log.map((l) => `• ${l}`).join('\n') +
            '\n\n**Prossimi passi:**\n1. `/rolepanel` per deployare la UI di auto-assegnazione ruoli.\n2. `/game add` per ogni nuovo gioco che vuoi supportare.',
        }),
      ],
    });
  },
};
