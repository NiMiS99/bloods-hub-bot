// src/commands/admin/autothread.js
// /autothread — Enable/disable auto-thread in a channel.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const autoThreadService = require('../../services/autoThreadService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autothread')
    .setDescription('Gestisci auto-thread nei canali (crea thread automatici per ogni messaggio).')
    .addSubcommand((sc) =>
      sc.setName('enable').setDescription('Abilita auto-thread in un canale.')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale dove abilitare auto-thread.').setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((sc) =>
      sc.setName('disable').setDescription('Disabilita auto-thread in un canale.')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale dove disabilitare auto-thread.').setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista canali con auto-thread attivo.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, _client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Solo gli admin possono usare questo comando.')],
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'enable') {
      const channel = interaction.options.getChannel('canale');
      const added = await autoThreadService.addAutoThreadChannel(interaction.guild.id, channel.id);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.autothread.enable',
        targetType: 'channel',
        targetId: channel.id,
      });
      return interaction.reply({
        embeds: [successEmbed(added
          ? `Auto-thread abilitato in ${channel}! Ogni messaggio creerà automaticamente un thread.`
          : `Auto-thread era già abilitato in ${channel}.`)],
        flags: 64,
      });
    }

    if (sub === 'disable') {
      const channel = interaction.options.getChannel('canale');
      const removed = await autoThreadService.removeAutoThreadChannel(interaction.guild.id, channel.id);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.autothread.disable',
        targetType: 'channel',
        targetId: channel.id,
      });
      return interaction.reply({
        embeds: [successEmbed(removed
          ? `Auto-thread disabilitato in ${channel}.`
          : `Auto-thread non era attivo in ${channel}.`)],
        flags: 64,
      });
    }

    if (sub === 'list') {
      const channels = await autoThreadService.getAutoThreadChannels(interaction.guild.id);
      if (channels.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed('Nessun canale con auto-thread attivo.')],
          flags: 64,
        });
      }
      const list = channels.map((id) => `• <#${id}> (\`${id}\`)`).join('\n');
      return interaction.reply({
        embeds: [successEmbed(`**Canali con auto-thread (${channels.length}):**\n${list}`)],
        flags: 64,
      });
    }
  },
};
