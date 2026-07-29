// src/commands/members.js
// /members — list members by role.
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('members')
    .setDescription('Lista membri del server, filtrabili per ruolo.')
    .addRoleOption((o) => o.setName('ruolo').setDescription('Filtra per ruolo.').setRequired(false))
    .addBooleanOption((o) => o.setName('online').setDescription('Solo membri online.').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const role = interaction.options.getRole('ruolo');
    const onlineOnly = interaction.options.getBoolean('online') || false;

    let members = [...interaction.guild.members.cache.values()];
    members = members.filter((m) => !m.user.bot);

    if (role) {
      members = members.filter((m) => m.roles.cache.has(role.id));
    }
    if (onlineOnly) {
      members = members.filter((m) => m.presence?.status !== 'offline');
    }

    members.sort((a, b) => {
      // Sort by: online first, then by join date
      const aOnline = a.presence?.status !== 'offline' ? 0 : 1;
      const bOnline = b.presence?.status !== 'offline' ? 0 : 1;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return a.joinedTimestamp - b.joinedTimestamp;
    });

    if (members.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Nessun membro trovato con questi filtri.')] });
    }

    const pageSize = 20;
    const totalPages = Math.ceil(members.length / pageSize);
    const page1 = members.slice(0, pageSize);

    const memberList = page1.map((m, i) => {
      const status = m.presence?.status === 'online' ? '🟢' : m.presence?.status === 'idle' ? '🟡' : m.presence?.status === 'dnd' ? '🔴' : '⚫';
      const joinDate = new Date(m.joinedTimestamp).toLocaleDateString('it-IT');
      return `${status} <@${m.id}> — ${m.user.tag}\n   Unitosi: ${joinDate}`;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle(`👥 Membri${role ? ` — ${role.name}` : ''}`)
      .setColor(0x8b0000)
      .setDescription(
        `**Totale:** ${members.length}${onlineOnly ? ' (online)' : ''}\n` +
        `**Pagina:** 1/${totalPages}\n\n${memberList}`
      )
      .setFooter({ text: `Bloods Community • /members` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
