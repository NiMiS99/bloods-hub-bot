// src/commands/refreshstats.js
// /refreshstats [user] — re-fetch external API stats for a member (or yourself).
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ExternalAccount, User, Game } = require('../db');
const { getApiForGame } = require('../services/api');
const { successEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshstats')
    .setDescription('Re-fetch external API stats for a member (or yourself).')
    .addUserOption((o) => o.setName('user').setDescription('Membro (tu per default).').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const isSelf = target.id === interaction.user.id;
    if (!isSelf && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ embeds: [errorEmbed('Puoi aggiornare solo le tue statistiche.')], flags: 64 });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    const user = await User.findOne({ where: { user_id: target.id, guild_id: interaction.guild.id } });
    if (!user) {
      await interaction.editReply({ embeds: [errorEmbed('Nessun profilo trovato.')] });
      return;
    }

    const accounts = await ExternalAccount.findAll({
      where: { user_id: target.id, guild_id: interaction.guild.id },
    });
    if (accounts.length === 0) {
      await interaction.editReply({ embeds: [errorEmbed('Nessun account esterno collegato. Usa /link prima.')] });
      return;
    }

    const models = { GameStat: require('../db').GameStat, Game };
    let total = 0;
    for (const acct of accounts) {
      const games = await Game.findAll({ where: { api_provider: acct.provider, is_active: true } });
      for (const game of games) {
        const api = getApiForGame(game);
        if (!api || !api.enabled) continue;
        try {
          const n = await api.refreshForUser(models, user, acct);
          total += n;
        } catch (err) {
          // surfaced by service; continue
        }
      }
    }
    await interaction.editReply({ embeds: [successEmbed(`Aggiornate ${total} riga/e di statistiche per ${target.username}.`)] });
  },
};
