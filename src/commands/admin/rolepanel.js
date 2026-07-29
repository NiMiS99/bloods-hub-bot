// src/commands/admin/rolepanel.js
// Admin command: deploy/refresh the role-selection panel in a channel.
// Defaults to the ROLE_PANEL_CHANNEL_ID from .env (ID-based, no name search).
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { buildRolePanel } = require('../../ui/roleSelection');
const { Guild } = require('../../db');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolepanel')
    .setDescription('Deploya o aggiorna il pannello interattivo di selezione dei ruoli di gioco.')
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Canale in cui postare il pannello (predefinito: ROLE_PANEL_CHANNEL_ID da .env).')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, _client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Non hai i permessi per usare questo comando. Serve il ruolo **Bloods Admin** o permessi Discord equivalenti.')],
        flags: 64,
      });
    }
    // Priority: explicit option > ROLE_PANEL_CHANNEL_ID from .env > current channel
    let channel = interaction.options.getChannel('channel');
    if (!channel && config.channels.rolePanel) {
      channel = interaction.guild.channels.cache.get(config.channels.rolePanel);
    }
    if (!channel) {
      channel = interaction.channel;
    }

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({ embeds: [errorEmbed('Il canale deve essere un canale testuale. Imposta ROLE_PANEL_CHANNEL_ID nel .env o specifica un canale.')], flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });
    try {
      const payload = await buildRolePanel(interaction.guild);
      await channel.send(payload);

      // Persist the channel id in guild config.
      await Guild.update(
        { role_selection_channel_id: channel.id },
        { where: { guild_id: interaction.guild.id } }
      );

      await interaction.editReply({
        embeds: [successEmbed(`Pannello di selezione giochi deployato in ${channel}.`)],
      });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Operazione fallita: ${err.message}`)] });
    }
  },
};
