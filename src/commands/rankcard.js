// src/commands/rankcard.js
// /rankcard — generate and send a visual rank card image for a user.
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embed');
const rankCardService = require('../services/rankCardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankcard')
    .setDescription('Genera un\'immagine rank card con il tuo livello ed XP.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Membro (tu per default).').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;

    // Fetch the guild member for display name and role color
    let member = null;
    if (target.id === interaction.user.id) {
      member = interaction.member;
    } else {
      member = await interaction.guild.members.fetch(target.id).catch(() => null);
    }

    await interaction.deferReply();

    try {
      const imageBuffer = await rankCardService.generateRankCard(interaction.guild, target, member);

      if (!imageBuffer) {
        return interaction.editReply({
          embeds: [errorEmbed('Impossibile generare la rank card. Riprova più tardi.')],
        });
      }

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'rankcard.png' });

      return interaction.editReply({
        content: target.id === interaction.user.id
          ? `Ecco la tua rank card, <@${target.id}>!`
          : `Rank card di **${member?.displayName || target.username}**:`,
        files: [attachment],
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [errorEmbed(`Errore durante la generazione della rank card: ${err.message}`)],
      });
    }
  },
};
