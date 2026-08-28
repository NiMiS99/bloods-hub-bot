// src/commands/recruit.js
// /recruit — Recruiting pipeline tracking for the Bloods guild.
// Subcommands:
//   add [user] [bnet] [character] [class] [ilvl] [source] — add new recruit
//   status [user] — show recruit status
//   update [user] [status] [notes] — update recruit status (Officer+)
//   list [status] — list recruits by status
//   trial [user] [days] — start trial period (Officer+)
//   approve [user] — approve recruit → full member (Officer+)
//   reject [user] [reason] — reject recruit (Officer+)
const { SlashCommandBuilder } = require('discord.js');
const { Recruit } = require('../db');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

const STATUS_LABELS = {
  first_contact: '🟡 Primo contatto',
  colloquio_scheduled: '🔵 Colloquio programmato',
  colloquio_done: '🟠 Colloquio fatto',
  trial: '🟣 In prova (Trial)',
  approved: '🟢 Approvato (Membro)',
  rejected: '🔴 Rifiutato',
  left: '⚫ Ha lasciato',
};

const STATUS_FLOW = ['first_contact', 'colloquio_scheduled', 'colloquio_done', 'trial', 'approved'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recruit')
    .setDescription('Pipeline reclutamento gilda (Officer+)')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Aggiungi nuovo recruit')
        .addUserOption(opt => opt.setName('user').setDescription('Utente Discord').setRequired(true))
        .addStringOption(opt => opt.setName('bnet_tag').setDescription('BattleTag (es: Nome#1234)').setRequired(false))
        .addStringOption(opt => opt.setName('character').setDescription('Nome PG principale').setRequired(false))
        .addStringOption(opt => opt.setName('class').setDescription('Classe PG').setRequired(false))
        .addIntegerOption(opt => opt.setName('ilvl').setDescription('Item level').setRequired(false))
        .addStringOption(opt => opt.setName('source').setDescription('Fonte reclutamento').setRequired(false)
          .addChoices(
            { name: 'Discord', value: 'discord' },
            { name: 'Reddit', value: 'reddit' },
            { name: 'In-game', value: 'in-game' },
            { name: 'Amico gildano', value: 'friend' },
            { name: 'Forum WoW', value: 'forum' },
            { name: 'Altro', value: 'other' },
          ))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Stato di un recruit')
        .addUserOption(opt => opt.setName('user').setDescription('Utente').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('update')
        .setDescription('Aggiorna stato recruit (Officer+)')
        .addUserOption(opt => opt.setName('user').setDescription('Utente').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('Nuovo stato').setRequired(true)
          .addChoices(
            { name: '🟡 Primo contatto', value: 'first_contact' },
            { name: '🔵 Colloquio programmato', value: 'colloquio_scheduled' },
            { name: '🟠 Colloquio fatto', value: 'colloquio_done' },
            { name: '🟣 In prova (Trial)', value: 'trial' },
            { name: '🟢 Approvato', value: 'approved' },
            { name: '🔴 Rifiutato', value: 'rejected' },
            { name: '⚫ Ha lasciato', value: 'left' },
          ))
        .addStringOption(opt => opt.setName('notes').setDescription('Note').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista recruits per stato')
        .addStringOption(opt => opt.setName('status').setDescription('Filtra per stato').setRequired(false)
          .addChoices(
            { name: 'Tutti', value: 'all' },
            { name: 'In prova (Trial)', value: 'trial' },
            { name: 'Primo contatto', value: 'first_contact' },
            { name: 'Approvati', value: 'approved' },
            { name: 'Rifiutati', value: 'rejected' },
          ))
    )
    .addSubcommand(sub =>
      sub.setName('trial')
        .setDescription('Avvia periodo di prova (Officer+)')
        .addUserOption(opt => opt.setName('user').setDescription('Utente').setRequired(true))
        .addIntegerOption(opt => opt.setName('days').setDescription('Durata trial (giorni, default 30)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('approve')
        .setDescription('Approva recruit → membro gilda (Officer+)')
        .addUserOption(opt => opt.setName('user').setDescription('Utente').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('reject')
        .setDescription('Rifiuta recruit (Officer+)')
        .addUserOption(opt => opt.setName('user').setDescription('Utente').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Motivo rifiuto').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    // Check Officer+ for all subcommands except 'status' and 'list'
    const officerRoles = ['Officer', 'Officer Reclutatore', 'Officer in Prova', 'Guida Incursioni', 'Guida Spedizioni', 'Bloods Admin', 'Consigliere', 'Founder', 'Owner'];
    const isOfficer = isAdmin(interaction.member) || officerRoles.some(r => interaction.member.roles.cache.some(mr => mr.name === r));

    if (sub === 'add') {
      if (!isOfficer) return interaction.reply({ embeds: [errorEmbed('Solo gli Officer possono aggiungere recruit.')], ephemeral: true });

      const user = interaction.options.getUser('user');
      const bnetTag = interaction.options.getString('bnet_tag');
      const character = interaction.options.getString('character');
      const charClass = interaction.options.getString('class');
      const ilvl = interaction.options.getInteger('ilvl');
      const source = interaction.options.getString('source') || 'other';

      const [recruit, created] = await Recruit.findOrCreate({
        where: { guild_id: interaction.guild.id, discord_id: user.id },
        defaults: {
          guild_id: interaction.guild.id,
          discord_id: user.id,
          discord_tag: user.tag,
          bnet_tag: bnetTag,
          character_name: character,
          character_class: charClass,
          character_ilvl: ilvl,
          source,
          status: 'first_contact',
          contacted_by: interaction.user.id,
        },
      });

      if (!created) {
        return interaction.reply({ embeds: [errorEmbed(`${user.username} è già nel pipeline (stato: ${STATUS_LABELS[recruit.status]}).`)], ephemeral: true });
      }

      return interaction.reply({ embeds: [successEmbed(`Recruit aggiunto: ${user.username}\nStato: ${STATUS_LABELS.first_contact}\nFonte: ${source}`)] });

    } else if (sub === 'status') {
      const user = interaction.options.getUser('user');
      const recruit = await Recruit.findOne({ where: { guild_id: interaction.guild.id, discord_id: user.id } });

      if (!recruit) {
        return interaction.reply({ embeds: [errorEmbed(`${user.username} non è nel pipeline reclutamento.`)], ephemeral: true });
      }

      const embed = baseEmbed({
        title: `Recruit — ${user.username}`,
        description:
          `**Stato:** ${STATUS_LABELS[recruit.status]}\n` +
          `**BattleTag:** ${recruit.bnet_tag || 'N/D'}\n` +
          `**PG:** ${recruit.character_name || 'N/D'} (${recruit.character_class || '?'})\n` +
          `**ilvl:** ${recruit.character_ilvl || 'N/D'}\n` +
          `**Fonte:** ${recruit.source || 'N/D'}\n` +
          `**Contattato da:** <@${recruit.contacted_by || 'N/D'}>\n` +
          (recruit.trial_start_date ? `**Trial:** ${recruit.trial_start_date} → ${recruit.trial_end_date || 'in corso'}\n` : '') +
          (recruit.trial_notes ? `**Note:** ${recruit.trial_notes}\n` : '') +
          (recruit.rejected_reason ? `**Motivo rifiuto:** ${recruit.rejected_reason}\n` : ''),
      });

      return interaction.reply({ embeds: [embed] });

    } else if (sub === 'update') {
      if (!isOfficer) return interaction.reply({ embeds: [errorEmbed('Solo gli Officer possono aggiornare lo stato.')], ephemeral: true });

      const user = interaction.options.getUser('user');
      const status = interaction.options.getString('status');
      const notes = interaction.options.getString('notes');

      const recruit = await Recruit.findOne({ where: { guild_id: interaction.guild.id, discord_id: user.id } });
      if (!recruit) return interaction.reply({ embeds: [errorReply(`${user.username} non trovato nel pipeline.`)], ephemeral: true });

      recruit.status = status;
      if (notes) recruit.trial_notes = notes;
      if (status === 'trial' && !recruit.trial_start_date) {
        recruit.trial_start_date = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        recruit.trial_end_date = endDate.toISOString().split('T')[0];
      }
      await recruit.save();

      return interaction.reply({ embeds: [successEmbed(`Stato aggiornato: ${user.username} → ${STATUS_LABELS[status]}`)] });

    } else if (sub === 'list') {
      const statusFilter = interaction.options.getString('status') || 'all';
      const where = { guild_id: interaction.guild.id };
      if (statusFilter !== 'all') where.status = statusFilter;

      const recruits = await Recruit.findAll({ where, order: [['created_at', 'DESC']], limit: 30 });
      if (recruits.length === 0) return interaction.reply({ embeds: [errorEmbed('Nessun recruit trovato.')], ephemeral: true });

      const embed = baseEmbed({
        title: `Lista Recruits (${statusFilter === 'all' ? 'tutti' : STATUS_LABELS[statusFilter]})`,
        description: `${recruits.length} recruit trovati`,
      });

      const list = recruits.map(r => `${STATUS_LABELS[r.status]} — <@${r.discord_id}> (${r.character_name || r.discord_tag || '?'})`).join('\n');
      embed.addFields({ name: 'Recruits', value: list.substring(0, 1024) });

      return interaction.reply({ embeds: [embed] });

    } else if (sub === 'trial') {
      if (!isOfficer) return interaction.reply({ embeds: [errorEmbed('Solo gli Officer possono avviare trial.')], ephemeral: true });

      const user = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days') || 30;

      const recruit = await Recruit.findOne({ where: { guild_id: interaction.guild.id, discord_id: user.id } });
      if (!recruit) return interaction.reply({ embeds: [errorEmbed(`${user.username} non trovato nel pipeline.`)], ephemeral: true });

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      recruit.status = 'trial';
      recruit.trial_start_date = startDate.toISOString().split('T')[0];
      recruit.trial_end_date = endDate.toISOString().split('T')[0];
      await recruit.save();

      return interaction.reply({ embeds: [successEmbed(`Trial avviato per ${user.username} (${days} giorni).\nDal ${startDate.toLocaleDateString('it-IT')} al ${endDate.toLocaleDateString('it-IT')}`)] });

    } else if (sub === 'approve') {
      if (!isOfficer) return interaction.reply({ embeds: [errorEmbed('Solo gli Officer possono approvare.')], ephemeral: true });

      const user = interaction.options.getUser('user');
      const recruit = await Recruit.findOne({ where: { guild_id: interaction.guild.id, discord_id: user.id } });
      if (!recruit) return interaction.reply({ embeds: [errorEmbed(`${user.username} non trovato nel pipeline.`)], ephemeral: true });

      recruit.status = 'approved';
      recruit.approved_by = interaction.user.id;
      await recruit.save();

      // Assign Bloods role
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (member) {
        const bloodsRole = interaction.guild.roles.cache.find(r => r.name === 'Bloods');
        if (bloodsRole) await member.roles.add(bloodsRole).catch(() => {});
      }

      return interaction.reply({ embeds: [successEmbed(`${user.username} approvato! Ruolo Bloods assegnato. 🎉`)] });

    } else if (sub === 'reject') {
      if (!isOfficer) return interaction.reply({ embeds: [errorEmbed('Solo gli Officer possono rifiutare.')], ephemeral: true });

      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const recruit = await Recruit.findOne({ where: { guild_id: interaction.guild.id, discord_id: user.id } });
      if (!recruit) return interaction.reply({ embeds: [errorEmbed(`${user.username} non trovato nel pipeline.`)], ephemeral: true });

      recruit.status = 'rejected';
      recruit.rejected_reason = reason;
      await recruit.save();

      return interaction.reply({ embeds: [successEmbed(`${user.username} rifiutato.${reason ? ` Motivo: ${reason}` : ''}`)] });
    }
  },
};
