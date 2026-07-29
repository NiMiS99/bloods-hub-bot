// src/commands/tournament.js
// /tournament — create and manage tournaments with brackets.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const { recordAudit } = require('../utils/auditLog');
const {
  createTournament, register, unregister, getParticipants,
  generateBracket, reportResult, getActiveTournaments, getTournament,
  buildBracketText,
} = require('../services/tournamentService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Gestisci tornei della community.')
    .addSubcommand((sub) =>
      sub.setName('create')
        .setDescription('Crea un nuovo torneo. (Admin)')
        .addStringOption((o) => o.setName('nome').setDescription('Nome del torneo.').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('gioco').setDescription('Gioco del torneo.').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('descrizione').setDescription('Descrizione.').setRequired(false).setMaxLength(4000))
        .addIntegerOption((o) => o.setName('partecipanti').setDescription('Max partecipanti (potenza di 2).').setRequired(false).setMinValue(2).setMaxValue(64)))
    .addSubcommand((sub) =>
      sub.setName('join')
        .setDescription('Iscriviti a un torneo.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('leave')
        .setDescription('Ritirati da un torneo.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('list')
        .setDescription('Lista tornei attivi.'))
    .addSubcommand((sub) =>
      sub.setName('bracket')
        .setDescription('Mostra il bracket di un torneo.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('start')
        .setDescription('Avvia il torneo e genera il bracket. (Admin)')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('result')
        .setDescription('Reporta il risultato di un match. (Admin)')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true))
        .addIntegerOption((o) => o.setName('match_id').setDescription('ID del match.').setRequired(true))
        .addUserOption((o) => o.setName('vincitore').setDescription('Utente vincitore.').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('info')
        .setDescription('Mostra info di un torneo.')
        .addIntegerOption((o) => o.setName('id').setDescription('ID del torneo.').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'create') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono creare tornei.')], flags: 64 });
      }
      const name = interaction.options.getString('nome');
      const game = interaction.options.getString('gioco');
      const description = interaction.options.getString('descrizione') || '';
      const maxParticipants = interaction.options.getInteger('partecipanti') || 16;

      const tournament = await createTournament({
        guildId, name, game, description, maxParticipants, createdBy: interaction.user.id,
      });

      await recordAudit({
        guildId, actorId: interaction.user.id,
        action: 'admin.tournament.create',
        targetType: 'tournament', targetId: tournament.id,
        details: { name, game, maxParticipants },
      });

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Torneo Creato: ${name}`)
        .setColor(0x8b0000)
        .setDescription(
          `**ID:** ${tournament.id}\n` +
          `**Gioco:** ${game}\n` +
          `**Descrizione:** ${description || 'N/A'}\n` +
          `**Posti:** ${maxParticipants}\n\n` +
          `📝 Iscriviti con: \`/tournament join id:${tournament.id}\``
        )
        .setFooter({ text: `Creato da ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'join') {
      const id = interaction.options.getInteger('id');
      const result = await register(id, interaction.user.id, guildId);
      if (result.error) {
        return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed(`Iscritto al torneo! **Posti:** ${result.count}/${result.max}`)], flags: 64 });
    }

    if (sub === 'leave') {
      const id = interaction.options.getInteger('id');
      const result = await unregister(id, interaction.user.id);
      if (!result.deleted) {
        return interaction.reply({ embeds: [errorEmbed('Non eri iscritto a questo torneo.')], flags: 64 });
      }
      await interaction.reply({ embeds: [successEmbed('Ti sei ritirato dal torneo.')], flags: 64 });
    }

    if (sub === 'list') {
      const tournaments = await getActiveTournaments(guildId);
      if (tournaments.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun torneo attivo.')], flags: 64 });
      }
      const embed = new EmbedBuilder()
        .setTitle('🏆 Tornei Attivi')
        .setColor(0x8b0000)
        .setDescription(
          tournaments.map((t) => {
            const status = t.status === 'registration' ? '📝 Iscrizioni' : '🎮 In corso';
            return `**ID ${t.id}:** ${t.name}\n  ${status} | ${t.game} | ${t.max_participants} posti`;
          }).join('\n\n')
        );
      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'bracket') {
      const id = interaction.options.getInteger('id');
      const tournament = await getTournament(id);
      if (!tournament) {
        return interaction.reply({ embeds: [errorEmbed('Torneo non trovato.')], flags: 64 });
      }
      if (!tournament.bracket) {
        return interaction.reply({ embeds: [errorEmbed('Bracket non ancora generato. Usa /tournament start.')], flags: 64 });
      }
      const bracketText = buildBracketText(tournament.bracket);
      const embed = new EmbedBuilder()
        .setTitle(`🏆 Bracket: ${tournament.name}`)
        .setColor(0x8b0000)
        .setDescription(bracketText.substring(0, 4000))
        .setFooter({ text: `Torneo ID ${tournament.id} • Round ${tournament.current_round + 1}` });
      await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (sub === 'start') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono avviare tornei.')], flags: 64 });
      }
      const id = interaction.options.getInteger('id');
      const result = await generateBracket(id);
      if (result.error) {
        return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
      }
      const bracketText = buildBracketText(result.rounds);
      const embed = new EmbedBuilder()
        .setTitle(`🏆 Torneo Avviato: ${result.tournament.name}`)
        .setColor(0x57f287)
        .setDescription(`Il bracket è stato generato!\n\n${bracketText.substring(0, 3500)}`)
        .setFooter({ text: 'Usa /tournament result per reportare i risultati' });
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'result') {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [errorEmbed('Solo gli admin possono reportare risultati.')], flags: 64 });
      }
      const id = interaction.options.getInteger('id');
      const matchId = interaction.options.getInteger('match_id');
      const winner = interaction.options.getUser('vincitore');
      const result = await reportResult(id, matchId, winner.id);
      if (result.error) {
        return interaction.reply({ embeds: [errorEmbed(result.error)], flags: 64 });
      }
      const isComplete = result.tournament.status === 'completed';
      const embed = isComplete
        ? new EmbedBuilder()
            .setTitle('🏆 Torneo Completato!')
            .setColor(0xfee75c)
            .setDescription(`Il torneo **${result.tournament.name}** è terminato!\n\n🥇 **Vincitore:** ${winner}`)
        : successEmbed(`Risultato registrato! Vincitore: ${winner}`);
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'info') {
      const id = interaction.options.getInteger('id');
      const tournament = await getTournament(id);
      if (!tournament) {
        return interaction.reply({ embeds: [errorEmbed('Torneo non trovato.')], flags: 64 });
      }
      const participants = await getParticipants(id);
      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${tournament.name}`)
        .setColor(0x8b0000)
        .setDescription(
          `**Gioco:** ${tournament.game}\n` +
          `**Descrizione:** ${tournament.description || 'N/A'}\n` +
          `**Formato:** ${tournament.format}\n` +
          `**Stato:** ${tournament.status}\n` +
          `**Partecipanti:** ${participants.length}/${tournament.max_participants}\n\n` +
          (participants.length > 0
            ? `**Iscritti:**\n${participants.slice(0, 20).map((p) => `• <@${p.user_id}>${p.eliminated ? ' ❌' : ''}`).join('\n')}`
            : 'Nessun iscritto ancora.')
        )
        .setFooter({ text: `Torneo ID ${tournament.id}` });
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },
};
