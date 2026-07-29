// src/commands/mod/slowmode.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embed');
const { canModerate } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Imposta slowmode su un canale.')
    .addChannelOption((o) =>
      o.setName('canale').setDescription('Canale da modificare.').setRequired(false)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildStageVoice))
    .addIntegerOption((o) =>
      o.setName('secondi').setDescription('Secondi di slowmode (0 per disattivare).').setRequired(false).setMinValue(0).setMaxValue(21600)),

  async execute(interaction) {
    if (!canModerate(interaction.member, [PermissionFlagsBits.ManageChannels])) {
      return interaction.reply({ embeds: [errorEmbed('Non hai i permessi per usare questo comando.')], flags: 64 });
    }

    const channel = interaction.options.getChannel('canale') || interaction.channel;
    const seconds = interaction.options.getInteger('secondi') ?? 0;

    try {
      await channel.setRateLimitPerUser(seconds, `Slowmode by ${interaction.user.tag}`);
      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'mod.slowmode',
        targetType: 'channel',
        targetId: channel.id,
        details: { seconds },
      });

      if (seconds === 0) {
        await interaction.reply({ embeds: [successEmbed(`Slowmode disattivata su ${channel}.`)], flags: 64 });
      } else {
        const human = seconds >= 3600 ? `${Math.floor(seconds / 3600)}h` : seconds >= 60 ? `${Math.floor(seconds / 60)}min` : `${seconds}s`;
        await interaction.reply({ embeds: [successEmbed(`Slowmode impostata a **${human}** su ${channel}.`)], flags: 64 });
      }
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed(`Errore: ${err.message}`)], flags: 64 });
    }
  },
};
