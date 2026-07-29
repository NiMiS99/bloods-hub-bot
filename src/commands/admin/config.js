// src/commands/admin/config.js
// /config — View and update bot configuration interactively.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { Guild } = require('../../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Visualizza o modifica la configurazione del bot.')
    .addSubcommand((sc) =>
      sc.setName('view').setDescription('Mostra la configurazione attuale.'))
    .addSubcommand((sc) =>
      sc.setName('levelup').setDescription('Imposta il canale per gli annunci di level-up.')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale per annunci level-up (lascia vuoto per disabilitare).').setRequired(false)
            .addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) =>
          o.setName('messaggio').setDescription('Template messaggio (usa {user} e {level}).').setRequired(false).setMaxLength(500)))
    .addSubcommand((sc) =>
      sc.setName('welcome').setDescription('Imposta il messaggio di benvenuto.')
        .addStringOption((o) =>
          o.setName('messaggio').setDescription('Template messaggio (usa {user}, {server}, {count}).').setRequired(true).setMaxLength(500)))
    .addSubcommand((sc) =>
      sc.setName('announcements').setDescription('Imposta il canale annunci.')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale per annunci (milestone, statistiche).').setRequired(true)
            .addChannelTypes(ChannelType.GuildText)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, _client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Solo gli admin possono usare questo comando.')],
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();
    const [guild] = await Guild.findOrCreate({
      where: { guild_id: interaction.guild.id },
      defaults: { guild_id: interaction.guild.id, name: interaction.guild.name },
    });

    if (sub === 'view') {
      const settings = [
        `**Level-up canale:** ${guild.level_up_channel_id ? `<#${guild.level_up_channel_id}>` : 'Non impostato'}`,
        `**Level-up messaggio:** \`${guild.level_up_message || 'Default (🎉 **{user}** ha raggiunto il livello **{level}**!)'}\``,
        `**Welcome canale:** ${guild.welcome_channel_id ? `<#${guild.welcome_channel_id}>` : 'Non impostato'}`,
        `**Welcome messaggio:** \`${guild.welcome_message || 'Default'}\``,
        `**Annunci canale:** ${guild.announcements_channel_id ? `<#${guild.announcements_channel_id}>` : 'Non impostato'}`,
        `**XP abilitato:** ${guild.xp_enabled ? 'Sì' : 'No'}`,
        `**XP per messaggio:** ${guild.xp_per_message || 1}`,
        `**XP per minuto vocale:** ${guild.xp_per_voice_minute || 5}`,
        `**Automod:** ${guild.automod_enabled ? 'Attiva' : 'Disattivata'}`,
        `**Starboard:** ${guild.starboard_channel_id ? `<#${guild.starboard_channel_id}>` : 'Non impostato'}`,
        `**Birthday canale:** ${guild.birthday_channel_id ? `<#${guild.birthday_channel_id}>` : 'Non impostato'}`,
      ].join('\n');

      return interaction.reply({
        embeds: [baseEmbed({
          title: '⚙️ Configurazione Bot',
          description: settings,
          color: 0x8b0000,
        })],
        flags: 64,
      });
    }

    if (sub === 'levelup') {
      const channel = interaction.options.getChannel('canale');
      const message = interaction.options.getString('messaggio');
      const updates = {};
      if (channel !== undefined) updates.level_up_channel_id = channel?.id || null;
      if (message) updates.level_up_message = message;
      await guild.update(updates);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.config.levelup',
        targetType: 'guild',
        details: updates,
      });
      return interaction.reply({
        embeds: [successEmbed(
          `Configurazione level-up aggiornata!\n` +
          `**Canale:** ${channel ? `<#${channel.id}>` : 'Disabilitato'}\n` +
          (message ? `**Messaggio:** \`${message}\`` : '')
        )],
        flags: 64,
      });
    }

    if (sub === 'welcome') {
      const message = interaction.options.getString('messaggio');
      await guild.update({ welcome_message: message, welcome_enabled: true });
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.config.welcome',
        targetType: 'guild',
        details: { welcome_message: message },
      });
      return interaction.reply({
        embeds: [successEmbed(`Messaggio di benvenuto aggiornato!\n**Template:** \`${message}\``)],
        flags: 64,
      });
    }

    if (sub === 'announcements') {
      const channel = interaction.options.getChannel('canale');
      await guild.update({ announcements_channel_id: channel.id });
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.config.announcements',
        targetType: 'channel',
        targetId: channel.id,
      });
      return interaction.reply({
        embeds: [successEmbed(`Canale annunci impostato: ${channel}!\nLe milestone e le statistiche settimanali verranno postate qui.`)],
        flags: 64,
      });
    }
  },
};
