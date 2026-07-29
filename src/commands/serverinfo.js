// src/commands/serverinfo.js
// /serverinfo — shows comprehensive server information.
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { User, Game, UserGame, Warning } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Mostra informazioni complete sul server.'),

  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.members.fetch();
    await guild.channels.fetch();
    await guild.roles.fetch();

    const humans = guild.members.cache.filter((m) => !m.user.bot).size;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;
    const online = guild.members.cache.filter((m) => m.presence?.status && m.presence.status !== 'offline' && !m.user.bot).size;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const forums = guild.channels.cache.filter((c) => c.type === ChannelType.GuildForum).size;
    const stages = guild.channels.cache.filter((c) => c.type === ChannelType.GuildStageVoice).size;

    const roles = guild.roles.cache.filter((r) => r.name !== '@everyone').size;

    // DB stats
    const dbUsers = await User.count({ where: { guild_id: guild.id } });
    const dbGames = await Game.count({ where: { is_active: true } });
    const dbMemberships = await UserGame.count({ where: { guild_id: guild.id } });
    const dbWarnings = await Warning.count({ where: { guild_id: guild.id } });

    // Server dates
    const created = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setTitle(`Informazioni Server — ${guild.name}`)
      .setColor(0x8b0000)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Nome Server', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${owner.id}>`, inline: true },
        { name: 'Creato il', value: created, inline: true },
        { name: 'Livello Boost', value: `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount} boost)`, inline: true },
        { name: 'Regione', value: guild.preferredLocale || 'Auto', inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: 'Membri Totali', value: `${guild.memberCount}`, inline: true },
        { name: 'Umani', value: `${humans}`, inline: true },
        { name: 'Bot', value: `${bots}`, inline: true },
        { name: 'Online', value: `${online}`, inline: true },
        { name: 'Ruoli', value: `${roles}`, inline: true },
        { name: 'Emoji', value: `${guild.emojis.cache.size}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: 'Canali Testo', value: `${textChannels}`, inline: true },
        { name: 'Canali Vocale', value: `${voiceChannels}`, inline: true },
        { name: 'Stage', value: `${stages}`, inline: true },
        { name: 'Categorie', value: `${categories}`, inline: true },
        { name: 'Forum', value: `${forums}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: false },
        { name: 'Utenti DB', value: `${dbUsers}`, inline: true },
        { name: 'Giochi Attivi', value: `${dbGames}`, inline: true },
        { name: 'Iscrizioni Giochi', value: `${dbMemberships}`, inline: true },
        { name: 'Warning Attivi', value: `${dbWarnings}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Bloods Community • ${guild.name}` });

    if (guild.bannerURL) {
      embed.setImage(guild.bannerURL({ size: 1024 }));
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
