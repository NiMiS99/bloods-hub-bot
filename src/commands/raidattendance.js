// src/commands/raidattendance.js
// /raidattendance — Mark raid attendance and award BP automatically.
// Subcommands:
//   mark [raid_name] [voice_channel] [kills_normal] [kills_heroic] [kills_mythic]
//   stats [user] — show attendance stats for a user
//   list [raid_name] [date] — list attendance for a specific raid
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInstance, BP_REWARDS } = require('../services/raidAttendanceService');
const { BpUser, RaidAttendance } = require('../db');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidattendance')
    .setDescription('Gestione presenze raid e BP automatici')
    .addSubcommand(sub =>
      sub.setName('mark')
        .setDescription('Segna presenze raid e assegna BP (Raid Leader+)')
        .addStringOption(opt => opt.setName('raid_name').setDescription('Nome raid (es: The Venomous Abyss)').setRequired(true))
        .addChannelOption(opt => opt.setName('voice_channel').setDescription('Canale vocale raid (auto-detect se omesso)').setRequired(false))
        .addIntegerOption(opt => opt.setName('kills_normal').setDescription('Boss killati Normal').setRequired(false))
        .addIntegerOption(opt => opt.setName('kills_heroic').setDescription('Boss killati Heroic').setRequired(false))
        .addIntegerOption(opt => opt.setName('kills_mythic').setDescription('Boss killati Mythic').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('Statistiche presenze raid (ultimi 30 giorni)')
        .addUserOption(opt => opt.setName('user').setDescription('Utente (tu se omesso)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Lista presenze per una data raid')
        .addStringOption(opt => opt.setName('raid_name').setDescription('Nome raid').setRequired(false))
        .addStringOption(opt => opt.setName('date').setDescription('Data (YYYY-MM-DD)').setRequired(false))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'mark') {
      // Only Raid Leader+ can mark attendance
      if (!isAdmin(interaction.member)) {
        const officerRoles = ['Officer', 'Officer Reclutatore', 'Officer in Prova', 'Guida Incursioni', 'Guida Spedizioni', 'Bloods Admin', 'Consigliere', 'Founder', 'Owner'];
        const hasRole = officerRoles.some(r => interaction.member.roles.cache.some(mr => mr.name === r));
        if (!hasRole) {
          return interaction.reply({ embeds: [errorEmbed('Solo i Raid Leader e Officer possono segnare le presenze.')], ephemeral: true });
        }
      }

      await interaction.deferReply();

      const raidName = interaction.options.getString('raid_name');
      const voiceChannel = interaction.options.getChannel('voice_channel');
      const killsNormal = interaction.options.getInteger('kills_normal') || 0;
      const killsHeroic = interaction.options.getInteger('kills_heroic') || 0;
      const killsMythic = interaction.options.getInteger('kills_mythic') || 0;

      const service = getInstance();
      if (!service) {
        return interaction.editReply({ embeds: [errorEmbed('Servizio presenze non inizializzato.')] });
      }

      const guildId = interaction.guild.id;

      // Detect attendees from voice channel
      let attendees = [];
      if (voiceChannel) {
        attendees = await service.detectFromVoiceChannel(guildId, voiceChannel.id);
      } else {
        // Auto-detect: find the raid voice channel (stage channel named "Incursione" or similar)
        const guild = interaction.guild;
        await guild.channels.fetch();
        const raidChannel = [...guild.channels.cache.values()].find(
          c => c.isVoiceBased() && c.members.size > 0 &&
               (c.name.includes('💀') || c.name.includes('raid') || c.name.includes('Incursione'))
        );
        if (raidChannel) {
          attendees = await service.detectFromVoiceChannel(guildId, raidChannel.id);
        }
      }

      if (attendees.length === 0) {
        return interaction.editReply({ embeds: [errorEmbed('Nessun player trovato nel canale vocale raid. Specifica il canale con `voice_channel`.')] });
      }

      const raidDate = new Date();
      const kills = { normal: killsNormal, heroic: killsHeroic, mythic: killsMythic };

      const result = await service.markAttendance(guildId, raidName, raidDate, attendees, interaction.user.id, kills);

      // Build summary embed
      let bpBreakdown = `**Presenza:** +${BP_REWARDS.presence} BP\n`;
      bpBreakdown += `**Puntualità:** +${BP_REWARDS.punctuality} BP\n`;
      if (killsNormal > 0) bpBreakdown += `**Kill Normal (${killsNormal}):** +${killsNormal * BP_REWARDS.killNormal} BP\n`;
      if (killsHeroic > 0) bpBreakdown += `**Kill Heroic (${killsHeroic}):** +${killsHeroic * BP_REWARDS.killHeroic} BP\n`;
      if (killsMythic > 0) bpBreakdown += `**Kill Mythic (${killsMythic}):** +${killsMythic * BP_REWARDS.killMythic} BP\n`;
      if (killsNormal === 0 && killsHeroic === 0 && killsMythic === 0) {
        bpBreakdown += `**Wipe night:** +${BP_REWARDS.wipeNight} BP\n`;
      }

      const embed = baseEmbed({
        title: `Presenze Raid — ${raidName}`,
        description:
          `**Data:** ${raidDate.toLocaleDateString('it-IT')}\n` +
          `**Player presenti:** ${result.marked}\n` +
          `**BP totali assegnati:** ${result.bpAwarded >= 0 ? '+' : ''}${result.bpAwarded}\n\n` +
          `**Dettaglio BP per player:**\n${bpBreakdown}\n` +
          (result.errors.length > 0 ? `**Errori:** ${result.errors.length}\n` : ''),
        footer: { text: `Segnato da ${interaction.user.tag}` },
      });

      // List attendees
      const attendeeList = attendees.map(a => `<@${a.userId}> ${a.punctual ? ' (puntuale)' : ''}`).join('\n');
      embed.addFields({ name: 'Attendees', value: attendeeList.substring(0, 1024) });

      return interaction.editReply({ embeds: [embed] });

    } else if (sub === 'stats') {
      const user = interaction.options.getUser('user') || interaction.user;
      const service = getInstance();
      if (!service) {
        return interaction.reply({ embeds: [errorEmbed('Servizio presenze non inizializzato.')], ephemeral: true });
      }

      const stats = await service.getUserStats(interaction.guild.id, user.id);
      const bpUser = await BpUser.findOne({ where: { guild_id: interaction.guild.id, user_id: user.id } });
      const bp = bpUser?.dkp || 0;

      const embed = baseEmbed({
        title: `Statistiche Raid — ${user.username}`,
        description:
          `**Presenze (30 giorni):**\n` +
          `Totali: ${stats.total}\n` +
          `Presente: ${stats.attended}\n` +
          `Assente: ${stats.missed}\n` +
          `Rate: ${stats.attendanceRate}%\n\n` +
          `**Bloods Points:** ${bp} BP`,
      });

      return interaction.reply({ embeds: [embed] });

    } else if (sub === 'list') {
      const raidName = interaction.options.getString('raid_name');
      const dateStr = interaction.options.getString('date');

      const where = { guild_id: interaction.guild.id };
      if (raidName) where.raid_name = raidName;
      if (dateStr) where.raid_date = dateStr;

      const records = await RaidAttendance.findAll({
        where,
        order: [['raid_date', 'DESC']],
        limit: 30,
      });

      if (records.length === 0) {
        return interaction.reply({ embeds: [errorEmbed('Nessun record presenze trovato.')], ephemeral: true });
      }

      const embed = baseEmbed({
        title: 'Lista Presenze Raid',
        description: `${records.length} record trovati`,
      });

      const list = records.map(r =>
        `${r.raid_date} | ${r.raid_name} | <@${r.user_id}> | ${r.attended ? '✅' : '❌'}`
      ).join('\n');

      embed.addFields({ name: 'Records', value: list.substring(0, 1024) });

      return interaction.reply({ embeds: [embed] });
    }
  },
};
