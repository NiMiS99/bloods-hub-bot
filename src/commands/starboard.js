// src/commands/starboard.js
// /starboard — configure and view the starboard (admin command).
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { isAdmin } = require('../utils/permissions');
const { recordAudit } = require('../utils/auditLog');
const starboardService = require('../services/starboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Gestisci la starboard della community.')
    .addSubcommand((sc) =>
      sc.setName('config').setDescription('Configura il canale starboard e la soglia minima di stelle.')
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Canale dove postare i messaggi stellati.').setRequired(true)
            .addChannelTypes(ChannelType.GuildText))
        .addIntegerOption((o) =>
          o.setName('threshold').setDescription('Numero minimo di stelle per apparire in starboard.').setRequired(false)
            .setMinValue(1).setMaxValue(50)))
    .addSubcommand((sc) =>
      sc.setName('view').setDescription('Mostra i messaggi più stellati.'))
    .addSubcommand((sc) =>
      sc.setName('leaderboard').setDescription('Top 10 utenti più stellati.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Solo gli admin possono usare questo comando.')],
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();

    // --- CONFIG ---
    if (sub === 'config') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold') ?? 5;

      const ok = await starboardService.setConfig(interaction.guild.id, channel.id, threshold);
      if (!ok) {
        return interaction.reply({
          embeds: [errorEmbed('Impossibile salvare la configurazione starboard.')],
          flags: 64,
        });
      }

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.starboard.config',
        targetType: 'channel',
        targetId: channel.id,
        details: { threshold },
      });

      return interaction.reply({
        embeds: [successEmbed(
          `Configurazione starboard salvata!\n` +
          `**Canale:** ${channel}\n` +
          `**Soglia:** ${threshold} ${threshold === 1 ? 'stella' : 'stelle'}`
        )],
        flags: 64,
      });
    }

    // --- VIEW ---
    if (sub === 'view') {
      await interaction.deferReply({ flags: 64 });

      const config = await starboardService.getConfig(interaction.guild.id);
      if (!config.channelId) {
        return interaction.editReply({
          embeds: [errorEmbed('La starboard non è configurata. Usa `/starboard config` per impostarla.')],
        });
      }

      const top = await starboardService.getTopMessages(interaction.guild.id, 10);

      if (top.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('Nessun messaggio stellato ancora.')],
        });
      }

      const list = top.map((m, i) => {
        const stars = '⭐'.repeat(Math.min(m.star_count, 10));
        const preview = (m.content || '*Messaggio senza testo*').slice(0, 80);
        return `**${i + 1}.** ${stars} **${m.star_count}** stelle\n` +
          `  <#${m.original_channel_id}> — [Vai al messaggio](https://discord.com/channels/${interaction.guild.id}/${m.original_channel_id}/${m.original_message_id})\n` +
          `  > ${preview}${m.content && m.content.length > 80 ? '…' : ''}`;
      }).join('\n\n');

      return interaction.editReply({
        embeds: [baseEmbed({
          title: `Messaggi più stellati`,
          description: list,
          footer: { text: `Starboard • Soglia: ${config.threshold} stelle • Bloods Community` },
        })],
      });
    }

    // --- LEADERBOARD ---
    if (sub === 'leaderboard') {
      await interaction.deferReply({ flags: 64 });

      const config = await starboardService.getConfig(interaction.guild.id);
      if (!config.channelId) {
        return interaction.editReply({
          embeds: [errorEmbed('La starboard non è configurata. Usa `/starboard config` per impostarla.')],
        });
      }

      const leaderboard = await starboardService.getLeaderboard(interaction.guild.id, 10);

      if (leaderboard.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('Nessun dato disponibile per la classifica starboard.')],
        });
      }

      const medals = [':first_place:', ':second_place:', ':third_place:'];
      const list = leaderboard.map((row, i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        const userId = row.user_id || row.USER_ID;
        const totalStars = row.total_stars || row.TOTAL_STARS || 0;
        const msgCount = row.message_count || row.MESSAGE_COUNT || 0;
        return `${medal} <@${userId}> — **${totalStars}** stelle (${msgCount} ${msgCount === 1 ? 'messaggio' : 'messaggi'})`;
      }).join('\n');

      return interaction.editReply({
        embeds: [baseEmbed({
          title: 'Classifica Starboard',
          description: list,
          footer: { text: 'Top 10 utenti più stellati • Bloods Community' },
        })],
      });
    }
  },
};
