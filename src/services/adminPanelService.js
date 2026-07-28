// src/services/adminPanelService.js
// Posts interactive admin panels in the #dashboard-admin channel.
// Panels: dashboard link, live stats, member management, audit log.
// All interactive via buttons — no external browser needed for common actions.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');
const { User, Guild, AuditLog, DiscordLog, BpUser, RaidEligibility, RaidConfig } = require('../db');

const GUILD_ID = '1010226759817515018';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://185.229.236.155:4567';

const CID = {
  // Admin panel buttons
  dashOpen: 'dash:open',
  statsRefresh: 'dash:stats',
  membersRefresh: 'dash:members',
  auditRefresh: 'dash:audit',
  raidRefresh: 'dash:raid',
  // Member management
  memberSearch: 'dash:membersearch',
  memberInfo: 'dash:memberinfo',
  // Rules panel
  rulesGeneral: 'rules:general',
  rulesRaid: 'rules:raid',
  rulesDkp: 'rules:dkp',
  rulesDiscord: 'rules:discord',
};

/**
 * Create the #dashboard-admin channel (Bloods Admin only).
 */
async function setupAdminChannel(client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  // Find or create the channel
  let channel = [...guild.channels.cache.values()].find(
    (c) => c.name === 'dashboard-admin' && c.type === ChannelType.GuildText
  );

  if (!channel) {
    // Find a staff category
    const category = [...guild.channels.cache.values()].find(
      (c) => c.type === ChannelType.GuildCategory && c.name && c.name.includes('Forum')
    );

    channel = await guild.channels.create({
      name: 'dashboard-admin',
      type: ChannelType.GuildText,
      parent: category?.id || null,
      topic: 'Pannello di amministrazione — solo Bloods Admin',
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        // Bloods Admin
        ...['Bloods Admin', 'Consigliere', 'Founder', 'Owner'].map((name) => {
          const role = guild.roles.cache.find((r) => r.name === name);
          if (!role) return null;
          return {
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.UseApplicationCommands],
          };
        }).filter(Boolean),
        // Bot
        {
          id: client.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.EmbedLinks],
        },
      ],
    });
    logger.info('AdminPanel: created #dashboard-admin channel.');
  }

  return channel;
}

/**
 * Post all admin panels in the channel.
 */
async function postPanels(client) {
  const channel = await setupAdminChannel(client);
  if (!channel) return;

  // Clear old bot messages
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const oldBotMsgs = messages.filter((m) => m.author.id === client.user.id);
    if (oldBotMsgs.size > 0) await channel.bulkDelete(oldBotMsgs).catch(() => {});
  } catch {}

  // Post panels
  await postDashboardLinkPanel(channel);
  await postStatsPanel(channel, client);
  await postRaidPanel(channel, client);
  await postAuditPanel(channel, client);

  logger.info('AdminPanel: all panels posted.');
}

/**
 * Panel 1: Dashboard link + quick actions
 */
async function postDashboardLinkPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('Dashboard Admin')
    .setColor(0x8b0000)
    .setDescription(
      '**Pannello di amministrazione Bloods Hub**\n\n' +
      `**Dashboard completa:** [Apri](${DASHBOARD_URL})\n` +
      `**API health:** [Stato](${DASHBOARD_URL}/api/health)\n\n` +
      '**Azioni rapide:**\n' +
      '• I bottoni qui sotto aggiornano i dati in tempo reale\n' +
      '• Usa `/raidstatus check` per controllare idoneità raid\n' +
      '• Usa `/raidreq view` per vedere la config raid\n' +
      '• Usa `/bp leaderboard` per la classifica DKP'
    )
    .setFooter({ text: 'Bloods Hub · Admin Dashboard · Aggiorna con i bottoni' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.statsRefresh).setLabel('Stats Server').setEmoji('📊').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(CID.raidRefresh).setLabel('Stats Raid').setEmoji('⚔️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.auditRefresh).setLabel('Audit Log').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(CID.membersRefresh).setLabel('Membri').setEmoji('👥').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Panel 2: Live server stats
 */
async function postStatsPanel(channel, client) {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  const stats = await collectServerStats(guild);

  const embed = new EmbedBuilder()
    .setTitle('📊 Statistiche Server (Live)')
    .setColor(0x8b0000)
    .addFields(
      { name: 'Membri totali', value: `**${stats.totalMembers}**`, inline: true },
      { name: 'Online', value: `**${stats.online}**`, inline: true },
      { name: 'Bot', value: `**${stats.bots}**`, inline: true },
      { name: 'Membri Bloods', value: `**${stats.bloodsMembers}**`, inline: true },
      { name: 'Membri community', value: `**${stats.communityMembers}**`, inline: true },
      { name: 'Progress', value: `**${stats.progressMembers}**`, inline: true },
      { name: 'Canali', value: `**${stats.channels}**`, inline: true },
      { name: 'Ruoli', value: `**${stats.roles}**`, inline: true },
      { name: 'Boost level', value: `**${stats.boostLevel}**`, inline: true },
    )
    .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.statsRefresh).setLabel('Aggiorna').setEmoji('🔄').setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Collect server stats
 */
async function collectServerStats(guild) {
  await guild.members.fetch();
  await guild.roles.fetch();

  const allMembers = [...guild.members.cache.values()];
  const humans = allMembers.filter((m) => !m.user.bot);
  const bots = allMembers.filter((m) => m.user.bot);
  const online = humans.filter((m) => m.presence?.status && m.presence.status !== 'offline');

  const findRole = (name) => [...guild.roles.cache.values()].find((r) => r.name === name);

  return {
    totalMembers: humans.length,
    online: online.length,
    bots: bots.length,
    bloodsMembers: findRole('Bloods')?.members.size || 0,
    communityMembers: findRole('Membro della community')?.members.size || 0,
    progressMembers: findRole('Progress')?.members.size || 0,
    channels: guild.channels.cache.size,
    roles: guild.roles.cache.size,
    boostLevel: guild.premiumTier,
  };
}

/**
 * Panel 3: Raid stats
 */
async function postRaidPanel(channel, client) {
  const guild = client.guilds.cache.get(GUILD_ID);

  const cfg = await RaidConfig.findOne({ where: { guild_id: GUILD_ID } });
  const eligible = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: true } });
  const ineligible = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: false } });
  const bpUsers = await BpUser.count({ where: { guild_id: GUILD_ID } });
  const bpTotal = await BpUser.sum('dkp', { where: { guild_id: GUILD_ID } }) || 0;

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const days = cfg?.raid_days || [3, 4];
  const dayStr = days.map((d) => dayNames[d]).join(', ');

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Stats Raid / Progress')
    .setColor(0x8b0000)
    .addFields(
      { name: 'Idonei', value: `**${eligible}**`, inline: true },
      { name: 'Non idonei', value: `**${ineligible}**`, inline: true },
      { name: 'Ruolo Progress', value: `**${findRoleMemberCount(guild, 'Progress')}**`, inline: true },
      { name: 'Ilvl minimo', value: `**${cfg?.min_ilvl || 0}**`, inline: true },
      { name: 'Giorni raid', value: `**${dayStr}**`, inline: true },
      { name: 'Orario', value: `**${cfg?.raid_time || '21:00'}**`, inline: true },
      { name: 'Totale BP in circolazione', value: `**${bpTotal}**`, inline: true },
      { name: 'Utenti con BP', value: `**${bpUsers}**`, inline: true },
      { name: 'Tier richiesto', value: cfg?.require_tier_bonus ? '**Sì**' : 'No', inline: true },
    )
    .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.raidRefresh).setLabel('Aggiorna').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

function findRoleMemberCount(guild, roleName) {
  const role = [...guild.roles.cache.values()].find((r) => r.name === roleName);
  return role?.members.size || 0;
}

/**
 * Panel 4: Audit log
 */
async function postAuditPanel(channel, client) {
  const logs = await AuditLog.findAll({
    where: { guild_id: GUILD_ID },
    order: [['created_at', 'DESC']],
    limit: 10,
  });

  let text = '_Nessun audit log_';
  if (logs.length > 0) {
    text = logs.map((l) => {
      const ts = Math.floor(new Date(l.created_at).getTime() / 1000);
      return `• <t:${ts}:R> \`${l.action}\` — <@${l.actor_id || '?'}>`;
    }).join('\n');
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Audit Log (ultimi 10)')
    .setColor(0x8b0000)
    .setDescription(text.slice(0, 4000))
    .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(CID.auditRefresh).setLabel('Aggiorna').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ===== Button handlers =====

async function handleButton(interaction, client) {
  const { customId } = interaction;

  if (customId === CID.statsRefresh) {
    await interaction.deferUpdate();
    const stats = await collectServerStats(interaction.guild);
    const embed = new EmbedBuilder()
      .setTitle('📊 Statistiche Server (Live)')
      .setColor(0x8b0000)
      .addFields(
        { name: 'Membri totali', value: `**${stats.totalMembers}**`, inline: true },
        { name: 'Online', value: `**${stats.online}**`, inline: true },
        { name: 'Bot', value: `**${stats.bots}**`, inline: true },
        { name: 'Membri Bloods', value: `**${stats.bloodsMembers}**`, inline: true },
        { name: 'Membri community', value: `**${stats.communityMembers}**`, inline: true },
        { name: 'Progress', value: `**${stats.progressMembers}**`, inline: true },
        { name: 'Canali', value: `**${stats.channels}**`, inline: true },
        { name: 'Ruoli', value: `**${stats.roles}**`, inline: true },
        { name: 'Boost level', value: `**${stats.boostLevel}**`, inline: true },
      )
      .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (customId === CID.raidRefresh) {
    await interaction.deferUpdate();
    const cfg = await RaidConfig.findOne({ where: { guild_id: GUILD_ID } });
    const eligible = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: true } });
    const ineligible = await RaidEligibility.count({ where: { guild_id: GUILD_ID, is_eligible: false } });
    const bpUsers = await BpUser.count({ where: { guild_id: GUILD_ID } });
    const bpTotal = await BpUser.sum('dkp', { where: { guild_id: GUILD_ID } }) || 0;
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const days = cfg?.raid_days || [3, 4];
    const dayStr = days.map((d) => dayNames[d]).join(', ');

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Stats Raid / Progress')
      .setColor(0x8b0000)
      .addFields(
        { name: 'Idonei', value: `**${eligible}**`, inline: true },
        { name: 'Non idonei', value: `**${ineligible}**`, inline: true },
        { name: 'Ruolo Progress', value: `**${findRoleMemberCount(interaction.guild, 'Progress')}**`, inline: true },
        { name: 'Ilvl minimo', value: `**${cfg?.min_ilvl || 0}**`, inline: true },
        { name: 'Giorni raid', value: `**${dayStr}**`, inline: true },
        { name: 'Orario', value: `**${cfg?.raid_time || '21:00'}**`, inline: true },
        { name: 'Totale BP', value: `**${bpTotal}**`, inline: true },
        { name: 'Utenti con BP', value: `**${bpUsers}**`, inline: true },
        { name: 'Tier richiesto', value: cfg?.require_tier_bonus ? '**Sì**' : 'No', inline: true },
      )
      .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (customId === CID.auditRefresh) {
    await interaction.deferUpdate();
    const logs = await AuditLog.findAll({
      where: { guild_id: GUILD_ID },
      order: [['created_at', 'DESC']],
      limit: 10,
    });
    let text = '_Nessun audit log_';
    if (logs.length > 0) {
      text = logs.map((l) => {
        const ts = Math.floor(new Date(l.created_at).getTime() / 1000);
        return `• <t:${ts}:R> \`${l.action}\` — <@${l.actor_id || '?'}>`;
      }).join('\n');
    }
    const embed = new EmbedBuilder()
      .setTitle('📋 Audit Log (ultimi 10)')
      .setColor(0x8b0000)
      .setDescription(text.slice(0, 4000))
      .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (customId === CID.membersRefresh) {
    await interaction.deferUpdate();
    const guild = interaction.guild;
    await guild.members.fetch();
    const humans = [...guild.members.cache.values()].filter((m) => !m.user.bot);
    const recent = humans.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0)).slice(0, 15);
    const text = recent.map((m) => {
      const ts = m.joinedTimestamp ? Math.floor(m.joinedTimestamp / 1000) : 0;
      return `• <@${m.id}> — entrato <t:${ts}:R>`;
    }).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('👥 Ultimi 15 membri')
      .setColor(0x8b0000)
      .setDescription(text || '_Nessun membro_')
      .setFooter({ text: 'Aggiornato · Clicca il bottone per refresh' })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    return;
  }
}

module.exports = {
  CID,
  setupAdminChannel,
  postPanels,
  handleButton,
  postStatsPanel,
  postRaidPanel,
  postAuditPanel,
};
