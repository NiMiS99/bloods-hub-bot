// src/commands/mygames.js
// /mygames — show the current user's game memberships with a button to
// edit the selection (links to the role panel channel).
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { UserGame, Game, User } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { formatDuration } = require('../utils/format');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mygames')
    .setDescription('Mostra i giochi a cui sei iscritto e come modificarli.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const user = await User.findOne({
      where: { user_id: interaction.user.id, guild_id: interaction.guild.id },
    });

    const memberships = await UserGame.findAll({
      where: { user_id: interaction.user.id, guild_id: interaction.guild.id },
      include: [Game],
    });

    const activeGames = memberships.filter((m) => m.Game && m.Game.is_active && m.Game.role_id);

    const embed = new EmbedBuilder()
      .setTitle(`🎮 I tuoi giochi`)
      .setColor(0x8b0000)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        activeGames.length > 0
          ? activeGames.map((m) => `• **${m.Game.name}** — <@&${m.Game.role_id}>`).join('\n')
          : 'Non sei iscritto a nessun gioco al momento.'
      )
      .addFields(
        { name: 'Messaggi', value: user ? String(user.total_messages) : '0', inline: true },
        { name: 'Tempo vocale', value: user ? formatDuration(user.total_voice_seconds) : '0s', inline: true },
        { name: 'Ultima attività', value: user && user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString('it-IT') : '—', inline: true }
      );

    // Button to edit selection (links to role panel channel).
    const rolePanelId = config.channels.rolePanel;
    const components = [];
    if (rolePanelId) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Modifica selezione giochi')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${interaction.guild.id}/${rolePanelId}`)
      );
      components.push(row);
    }

    await interaction.editReply({ embeds: [embed], components });
  },
};
