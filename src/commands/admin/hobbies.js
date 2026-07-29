// src/commands/admin/hobbies.js
// /hobbies — Create a self-role panel for generic hobbies/interests.
// Creates roles automatically (if missing) and posts a reaction role panel.
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const reactionRoleService = require('../../services/reactionRoleService');
const logger = require('../../utils/logger');

const HOBBY_PRESETS = [
  { emoji: '🎮', name: 'Gamer', color: 0x5865f2 },
  { emoji: '🎬', name: 'Cinefilo', color: 0xeb459e },
  { emoji: '📺', name: 'Anime', color: 0xf47fff },
  { emoji: '📚', name: 'Lettore', color: 0xfee75c },
  { emoji: '🎵', name: 'Musicista', color: 0x57f287 },
  { emoji: '💻', name: 'Tech', color: 0x00b0f4 },
  { emoji: '🎨', name: 'Artista', color: 0xf47b67 },
  { emoji: '⚽', name: 'Sport', color: 0x2ecc71 },
  { emoji: '🍕', name: 'Foodie', color: 0xe67e22 },
  { emoji: '✈️', name: 'Viaggiatore', color: 0x3498db },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hobbies')
    .setDescription('Crea un pannello self-role per hobby e interessi.')
    .addChannelOption((o) =>
      o.setName('canale')
        .setDescription('Canale dove pubblicare il pannello.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText))
    .addStringOption((o) =>
      o.setName('interessi')
        .setDescription('Lista personalizzata (opzionale). Formato: emoji,nome; emoji,nome. Default: 10 preset.')
        .setRequired(false)
        .setMaxLength(4000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Solo gli admin possono usare questo comando.')],
        flags: 64,
      });
    }

    const channel = interaction.options.getChannel('canale');
    const customList = interaction.options.getString('interessi');

    let hobbies = HOBBY_PRESETS;
    if (customList) {
      try {
        hobbies = customList.split(';').map((entry) => {
          const [emoji, name] = entry.split(',').map((s) => s.trim());
          if (!emoji || !name) throw new Error(`Formato non valido: "${entry}"`);
          return { emoji, name, color: 0x5865f2 };
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Formato interessi non valido: ${err.message}\nEsempio: \`🎮,Gamer; 📺,Anime; 💻,Tech\``)],
          flags: 64,
        });
      }
    }

    await interaction.deferReply({ flags: 64 });

    // Create roles if they don't exist
    const createdRoles = [];
    for (const hobby of hobbies) {
      let role = interaction.guild.roles.cache.find((r) => r.name === hobby.name);
      if (!role) {
        try {
          role = await interaction.guild.roles.create({
            name: hobby.name,
            color: hobby.color,
            mentionable: true,
            reason: `Self-role per hobby (${interaction.user.tag})`,
          });
          createdRoles.push(hobby.name);
        } catch (e) {
          logger.debug(`Failed to create role ${hobby.name}: ${e.message}`);
          continue;
        }
      }

      // Add to reaction role draft
      reactionRoleService.addDraftPair(
        interaction.guild.id,
        hobby.emoji,
        role.id,
        hobby.name
      );
    }

    // Post the panel
    const message = await reactionRoleService.postDraftPanel(
      client,
      interaction.guild.id,
      channel.id,
      '🎭 Scegli i tuoi interessi',
      'Reagisci con le emoji per ottenere il ruolo corrispondente.\nPuoi rimuovere il ruolo togliendo la reazione.'
    );

    if (!message) {
      return interaction.editReply({
        embeds: [errorEmbed('Impossibile pubblicare il pannello. Controlla i permessi del bot nel canale.')],
      });
    }

    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'admin.hobbies.create',
      targetType: 'channel',
      targetId: channel.id,
      details: {
        messageId: message.id,
        hobbiesCount: hobbies.length,
        createdRoles: createdRoles.length,
        custom: !!customList,
      },
    });

    const roleInfo = createdRoles.length > 0
      ? `\n**Ruoli creati (${createdRoles.length}):** ${createdRoles.join(', ')}`
      : '\n*Tutti i ruoli esistevano già.*';

    return interaction.editReply({
      embeds: [successEmbed(
        `Pannello hobby pubblicato in ${channel}!\n` +
        `**Interessi:** ${hobbies.length}\n` +
        `**Messaggio:** [Vai al pannello](${message.url})` +
        roleInfo
      )],
    });
  },
};
