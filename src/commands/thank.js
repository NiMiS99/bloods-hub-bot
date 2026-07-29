// src/commands/thank.js
// /thank — thank a user for their help, giving them reputation.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embed');
const { thankUser, getReputation, getTopReputation } = require('../services/reputationService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thank')
    .setDescription('Ringrazia un utente per il suo aiuto (dà reputazione + XP).')
    .addUserOption((o) => o.setName('user').setDescription("L'utente da ringraziare.").setRequired(false))
    .addStringOption((o) => o.setName('motivo').setDescription('Perché lo ringrazi?').setRequired(false).setMaxLength(200))
    .addBooleanOption((o) => o.setName('top').setDescription('Mostra la classifica reputazione.').setRequired(false))
    .addBooleanOption((o) => o.setName('view').setDescription('Mostra la reputazione (tua o di user).').setRequired(false)),

  async execute(interaction) {
    const wantTop = interaction.options.getBoolean('top');
    const wantView = interaction.options.getBoolean('view');

    if (wantTop) {
      await interaction.deferReply({ flags: 64 });
      const top = await getTopReputation(interaction.guild.id, 10);
      if (top.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessun dato reputazione ancora.')] });
      }
      const embed = new EmbedBuilder()
        .setTitle('🏆 Classifica Reputazione')
        .setColor(0xfee75c)
        .setDescription(
          top.map((r, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            return `${medal} <@${r.to_user_id}> — **${r.total}** reputazione`;
          }).join('\n')
        )
        .setFooter({ text: 'Bloods Community • /thank top' });
      return interaction.editReply({ embeds: [embed] });
    }

    if (wantView) {
      const target = interaction.options.getUser('user') || interaction.user;
      const rep = await getReputation(target.id, interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle(`🤝 Reputazione di ${target.username}`)
        .setColor(0xfee75c)
        .setThumbnail(target.displayAvatarURL())
        .setDescription(
          `**Ricevuta:** ${rep.received}\n` +
          `**Data:** ${rep.given}\n\n` +
          (rep.recent.length > 0 ? `**Ultimi ringraziamenti:**\n${rep.recent.map((r) => `• da <@${r.from_user_id}>${r.reason ? ` — ${r.reason}` : ''}`).join('\n')}` : 'Nessun ringraziamento ricevuto ancora.')
        )
        .setFooter({ text: 'Bloods Community • /thank view' });
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Default: thank a user
    const target = interaction.options.getUser('user');
    if (!target) {
      return interaction.reply({ embeds: [errorEmbed('Specifica un utente da ringraziare, oppure usa /thank top:true o view:true.')], flags: 64 });
    }
    const reason = interaction.options.getString('motivo') || '';

    const result = await thankUser(interaction.user.id, target.id, interaction.guild.id, reason);

    if (result.error) {
      return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle('🤝 Ringraziamento inviato!')
      .setColor(0x57f287)
      .setDescription(
        `${interaction.user} ha ringraziato ${target}!\n\n` +
        (reason ? `**Motivo:** ${reason}\n` : '') +
        `**Reputazione totale di ${target.username}:** ${result.totalRep}\n` +
        `**XP bonus assegnato:** +15`
      )
      .setFooter({ text: 'Usa /thank per ringraziare altri membri!' });

    await interaction.reply({ embeds: [embed] });
  },
};
