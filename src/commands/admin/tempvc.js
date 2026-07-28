// src/commands/admin/tempvc.js
// /tempvc — setup and manage temporary voice channels.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const TempVoiceService = require('../../services/tempVoiceService');
const { Guild } = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempvc')
    .setDescription('Gestisci i canali vocali temporanei.')
    .addSubcommand((sc) =>
      sc.setName('setup').setDescription('Imposta il canale creatore (join per creare un canale privato).')
        .addChannelOption((o) =>
          o.setName('canale').setDescription('Canale vocale creatore.').setRequired(true)
            .addChannelTypes(ChannelType.GuildVoice)))
    .addSubcommand((sc) =>
      sc.setName('disable').setDescription('Disabilita i canali vocali temporanei.'))
    .addSubcommand((sc) =>
      sc.setName('status').setDescription('Mostra lo stato dei canali temporanei.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('canale');
      await TempVoiceService.setCreatorChannel(interaction.guild.id, channel.id);

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.tempvc.setup',
        targetType: 'channel',
        targetId: channel.id,
        details: { channelName: channel.name },
      });

      return interaction.reply({
        embeds: [successEmbed(`Canale creatore impostato: **${channel.name}**\n\nQuando un utente entra in questo canale, verrà creato automaticamente un canale vocale privato a suo nome. Il canale viene eliminato quando diventa vuoto.`)],
        flags: 64,
      });
    }

    if (sub === 'disable') {
      await Guild.update(
        { temp_voice_creator_channel_id: null },
        { where: { guild_id: interaction.guild.id } }
      );
      return interaction.reply({ embeds: [successEmbed('Canali vocali temporanei disabilitati.')], flags: 64 });
    }

    if (sub === 'status') {
      const guildRow = await Guild.findOne({ where: { guild_id: interaction.guild.id } });
      const creatorId = guildRow?.temp_voice_creator_channel_id;
      const tempChannels = TempVoiceService.getTempChannels();

      if (!creatorId) {
        return interaction.reply({ embeds: [errorEmbed('I canali vocali temporanei non sono configurati. Usa `/tempvc setup`.')], flags: 64 });
      }

      const activeCount = [...tempChannels.values()].filter((t) => true).length;
      return interaction.reply({
        embeds: [successEmbed(
          `**Stato Canali Temporanei:**\n` +
          `Canale creatore: <#${creatorId}>\n` +
          `Canali attivi: **${activeCount}**`
        )],
        flags: 64,
      });
    }
  },
};
