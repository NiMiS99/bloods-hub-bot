// src/commands/raidreq.js
// Configure raid requirements (Guida only).
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { RaidConfig } = require('../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { recordAudit } = require('../utils/auditLog');
const { isRaidLeader } = require('../utils/bpHelpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidreq')
    .setDescription('Configura requisiti raid e scheduling (solo Guida).')

    .addSubcommand((sc) => sc.setName('view').setDescription('Mostra configurazione attuale.'))
    .addSubcommand((sc) => sc.setName('ilvl')
      .setDescription('Imposta item level minimo.')
      .addIntegerOption((o) => o.setName('valore').setDescription('Ilvl minimo (es: 630).').setRequired(true)))
    .addSubcommand((sc) => sc.setName('tier')
      .setDescription('Richiedi tier set bonus (2pc minimo).')
      .addBooleanOption((o) => o.setName('obbligatorio').setDescription('True = obbligatorio, False = non richiesto.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('achievement')
      .setDescription('Imposta achievement raid richiesto.')
      .addStringOption((o) => o.setName('id').setDescription('ID achievement (0 = disattiva).').setRequired(true)))
    .addSubcommand((sc) => sc.setName('attendance')
      .setDescription('Imposta presenze raid minime.')
      .addIntegerOption((o) => o.setName('valore').setDescription('Numero minimo di raid completati.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('schedule')
      .setDescription('Configura giorni e orari raid.')
      .addStringOption((o) => o.setName('giorni').setDescription('Giorni raid (es: 3,4 = Mer,Gio). 0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab').setRequired(true))
      .addStringOption((o) => o.setName('orario').setDescription('Orario raid (es: 21:00).').setRequired(false))
      .addStringOption((o) => o.setName('nome').setDescription('Nome raid (es: Manaforgia Omega).').setRequired(false)))
    .addSubcommand((sc) => sc.setName('role')
      .setDescription('Imposta ruolo Discord per player idonei.')
      .addRoleOption((o) => o.setName('ruolo').setDescription('Ruolo da assegnare ai player idonei.').setRequired(true)))
    .addSubcommand((sc) => sc.setName('channel')
      .setDescription('Imposta canale per annunci raid.')
      .addChannelOption((o) => o.setName('canale').setDescription('Canale annunci.').setRequired(true))),

  async execute(interaction, client) {
    if (!isRaidLeader(interaction.member)) {
      await interaction.reply({ embeds: [errorEmbed('Comando riservato alle **Guide Incursioni/Spedizioni** e staff.')], flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    const [cfg] = await RaidConfig.findOrCreate({
      where: { guild_id: guildId },
      defaults: { guild_id: guildId },
    });

    if (sub === 'view') {
      const days = cfg.raid_days || [3, 4];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const dayStr = days.map((d) => dayNames[d] || d).join(', ');
      await interaction.reply({
        embeds: [baseEmbed({ title: 'Configurazione Raid' })
          .addFields(
            { name: 'Ilvl minimo', value: `**${cfg.min_ilvl}**`, inline: true },
            { name: 'Tier bonus', value: cfg.require_tier_bonus ? '**Obbligatorio** (2pc+)' : 'Non richiesto', inline: true },
            { name: 'Achievement', value: cfg.require_achievement ? `\`${cfg.require_achievement}\`` : 'Non richiesto', inline: true },
            { name: 'Presenze minime', value: `**${cfg.min_raid_attendance}**`, inline: true },
            { name: 'Giorni raid', value: `**${dayStr}**`, inline: true },
            { name: 'Orario', value: `**${cfg.raid_time}**`, inline: true },
            { name: 'Nome raid', value: cfg.raid_name, inline: false },
            { name: 'Ruolo idonei', value: cfg.eligible_role_id ? `<@&${cfg.eligible_role_id}>` : 'Non impostato', inline: true },
            { name: 'Canale annunci', value: cfg.announce_channel_id ? `<#${cfg.announce_channel_id}>` : 'Non impostato', inline: true },
          )],
        flags: 64,
      });
      return;
    }

    if (sub === 'ilvl') {
      const val = interaction.options.getInteger('valore', true);
      await cfg.update({ min_ilvl: val });
      await interaction.reply({ embeds: [successEmbed(`Ilvl minimo impostato a **${val}**.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.ilvl', { value: val });
      return;
    }

    if (sub === 'tier') {
      const val = interaction.options.getBoolean('obbligatorio', true);
      await cfg.update({ require_tier_bonus: val });
      await interaction.reply({ embeds: [successEmbed(`Tier set bonus ${val ? '**obbligatorio**' : '**non richiesto**'}.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.tier', { required: val });
      return;
    }

    if (sub === 'achievement') {
      const id = interaction.options.getString('id', true);
      const cleanId = id === '0' || id === '' ? null : id;
      await cfg.update({ require_achievement: cleanId });
      await interaction.reply({ embeds: [successEmbed(`Achievement ${cleanId ? `impostato a \`${cleanId}\`` : 'disattivato'}.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.achievement', { id: cleanId });
      return;
    }

    if (sub === 'attendance') {
      const val = interaction.options.getInteger('valore', true);
      await cfg.update({ min_raid_attendance: val });
      await interaction.reply({ embeds: [successEmbed(`Presenze minime impostate a **${val}**.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.attendance', { value: val });
      return;
    }

    if (sub === 'schedule') {
      const giorni = interaction.options.getString('giorni', true);
      const orario = interaction.options.getString('orario');
      const nome = interaction.options.getString('nome');
      const days = giorni.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => d >= 0 && d <= 6);
      const updates = { raid_days: days.length > 0 ? days : [3, 4] };
      if (orario) updates.raid_time = orario;
      if (nome) updates.raid_name = nome;
      await cfg.update(updates);
      await interaction.reply({ embeds: [successEmbed(`Schedule aggiornata: giorni ${days.join(',')}, orario ${updates.raid_time || cfg.raid_time}.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.schedule', updates);
      return;
    }

    if (sub === 'role') {
      const role = interaction.options.getRole('ruolo', true);
      await cfg.update({ eligible_role_id: role.id });
      await interaction.reply({ embeds: [successEmbed(`Ruolo idonei impostato a <@&${role.id}>.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.role', { roleId: role.id });
      return;
    }

    if (sub === 'channel') {
      const ch = interaction.options.getChannel('canale', true);
      await cfg.update({ announce_channel_id: ch.id });
      await interaction.reply({ embeds: [successEmbed(`Canale annunci impostato a <#${ch.id}>.`)], flags: 64 });
      await recordAudit(interaction, 'raidreq.channel', { channelId: ch.id });
      return;
    }
  },
};
