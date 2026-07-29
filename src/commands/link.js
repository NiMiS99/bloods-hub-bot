// src/commands/link.js
// /link provider external_id [region] — link an external gaming account.
// /unlink provider — remove the link.
const { SlashCommandBuilder } = require('discord.js');
const { ExternalAccount, User, Guild } = require('../db');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { getApi: _getApi } = require('../services/api');

const PROVIDERS = ['steam', 'battlenet', 'riot'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Collega un account gaming esterno (Steam / Battle.net / Riot).')
    .addStringOption((o) =>
      o.setName('provider').setDescription('Piattaforma.').setRequired(true).setMaxLength(100).addChoices(
        PROVIDERS.map((p) => ({ name: p, value: p }))
      )
    )
    .addStringOption((o) => o.setName('external_id').setDescription('WoW: NomePersonaggio-Reame (es: Nimis-Antonidas). Steam: SteamID64. Riot: Nome#TAG.').setRequired(true).setMaxLength(100))
    .addStringOption((o) =>
      o.setName('region').setDescription('Regione (eu/na/kr/sea).').setRequired(false).setMaxLength(100).addChoices(
        ['eu', 'na', 'kr', 'sea'].map((r) => ({ name: r, value: r }))
      )
    ),

  async execute(interaction) {
    const provider = interaction.options.getString('provider');
    const externalId = interaction.options.getString('external_id');
    const region = interaction.options.getString('region') ?? 'eu';

    await interaction.deferReply({ flags: 64 });

    // Ensure user/guild rows.
    await Guild.findOrCreate({
      where: { guild_id: interaction.guild.id },
      defaults: { guild_id: interaction.guild.id, name: interaction.guild.name },
    });
    await User.findOrCreate({
      where: { user_id: interaction.user.id, guild_id: interaction.guild.id },
      defaults: { user_id: interaction.user.id, guild_id: interaction.guild.id, username: interaction.user.username },
    });

    // Quick validation: try a profile fetch if an API client exists.
    // Search all registered API clients for this provider.
    try {
      const { registry } = require('../services/api');
      // Find any registered client for this provider.
      const apiEntry = Object.entries(registry).find(([key]) => key.startsWith(`${provider}:`));
      const api = apiEntry ? apiEntry[1] : null;
      if (api?.fetchProfile) await api.fetchProfile(externalId, region);
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Impossibile verificare l'ID ${provider}: ${err.message}`)] });
      return;
    }

    const [acct, created] = await ExternalAccount.findOrCreate({
      where: { provider, external_id: externalId, guild_id: interaction.guild.id },
      defaults: {
        user_id: interaction.user.id,
        guild_id: interaction.guild.id,
        provider,
        external_id: externalId,
        region,
        verified: true,
      },
    });

    if (!created && acct.user_id !== interaction.user.id) {
      await interaction.editReply({ embeds: [errorEmbed('Questo account è già collegato a un altro membro.')] });
      return;
    }
    if (!created) {
      await acct.update({ region, verified: true });
    }

    await interaction.editReply({ embeds: [successEmbed(`Account ${provider} \`${externalId}\` collegato con successo.`)] });
  },
};
