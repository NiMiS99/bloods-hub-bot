// src/commands/admin/reactionrole.js
// /reactionrole — manage reaction role panels (add, remove, list, post).
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const reactionRoleService = require('../../services/reactionRoleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Gestisci i pannelli reaction role.')
    .addSubcommand((sc) =>
      sc.setName('add').setDescription('Aggiunge una coppia emoji→ruolo a un pannello esistente o ne crea uno nuovo (bozza).')
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji da usare (unicode o custom :nome:).').setRequired(true).setMaxLength(100))
        .addRoleOption((o) => o.setName('role').setDescription('Ruolo da assegnare.').setRequired(true))
        .addStringOption((o) => o.setName('description').setDescription('Descrizione opzionale del ruolo.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) =>
      sc.setName('post').setDescription('Posta il pannello reaction role nel canale.')
        .addChannelOption((o) => o.setName('channel').setDescription('Canale dove postare il pannello.').setRequired(true)
          .addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('title').setDescription('Titolo del pannello.').setRequired(false).setMaxLength(200))
        .addStringOption((o) => o.setName('description').setDescription('Descrizione del pannello.').setRequired(false).setMaxLength(4000)))
    .addSubcommand((sc) =>
      sc.setName('remove').setDescription('Rimuove un pannello reaction role esistente.')
        .addStringOption((o) => o.setName('message_id').setDescription('ID del messaggio del pannello da rimuovere.').setRequired(true).setMaxLength(100)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista tutti i pannelli reaction role.'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Solo gli admin possono usare questo comando.')],
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();

    // --- ADD ---
    if (sub === 'add') {
      const emoji = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');
      const description = interaction.options.getString('description');

      // Validate emoji format: unicode emoji or custom <:name:id>
      const isCustom = /^<a?:\w+:\d+>$/.test(emoji);
      const isUnicode = /\p{Extended_Pictographic}/u.test(emoji);
      if (!isCustom && !isUnicode) {
        return interaction.reply({
          embeds: [errorEmbed('Emoji non valida. Usa un\'emoji unicode o un\'emoji custom nel formato `:nome:`.')],
          flags: 64,
        });
      }

      // Check for managed/integration roles (cannot be assigned)
      if (role.managed) {
        return interaction.reply({
          embeds: [errorEmbed('Non puoi assegnare un ruolo gestito da un\'integrazione.')],
          flags: 64,
        });
      }

      // Check bot role hierarchy
      if (interaction.guild.members.me.roles.highest.position <= role.position) {
        return interaction.reply({
          embeds: [errorEmbed('Il ruolo è troppo in alto nella gerarchia. Il bot non può assegnarlo.')],
          flags: 64,
        });
      }

      // Add to draft
      const pairs = reactionRoleService.addDraftPair(
        interaction.guild.id,
        emoji,
        role.id,
        description || null
      );

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.reactionrole.add',
        targetType: 'role',
        targetId: role.id,
        details: { emoji, pairsCount: pairs.length },
      });

      const pairList = pairs.map((p) => `${p.emoji} → <@&${p.roleId}>${p.label ? ` (${p.label})` : ''}`).join('\n');
      return interaction.reply({
        embeds: [successEmbed(
          `Coppia **${emoji} → ${role}** aggiunta alla bozza del pannello.\n\n` +
          `**Coppie attuali (${pairs.length}):**\n${pairList}\n\n` +
          `Usa \`/reactionrole post\` per pubblicare il pannello.`
        )],
        flags: 64,
      });
    }

    // --- POST ---
    if (sub === 'post') {
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'Scegli i tuoi ruoli';
      const description = interaction.options.getString('description');

      const pairs = reactionRoleService.getDraftPairs(interaction.guild.id);
      if (pairs.length === 0) {
        return interaction.reply({
          embeds: [errorEmbed('Nessuna coppia nella bozza. Usa `/reactionrole add` per aggiungere emoji→ruolo prima di pubblicare.')],
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const message = await reactionRoleService.postDraftPanel(
        client,
        interaction.guild.id,
        channel.id,
        title,
        description
      );

      if (!message) {
        return interaction.editReply({
          embeds: [errorEmbed('Impossibile pubblicare il pannello. Controlla i permessi del bot nel canale.')],
        });
      }

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.reactionrole.post',
        targetType: 'channel',
        targetId: channel.id,
        details: { messageId: message.id, pairsCount: pairs.length, title },
      });

      return interaction.editReply({
        embeds: [successEmbed(
          `Pannello reaction role pubblicato in ${channel}!\n` +
          `**Messaggio:** [Vai al pannello](${message.url})\n` +
          `**Coppie:** ${pairs.length}\n` +
          `**ID messaggio:** \`${message.id}\``
        )],
      });
    }

    // --- REMOVE ---
    if (sub === 'remove') {
      const messageId = interaction.options.getString('message_id');

      // Validate message ID format
      if (!/^\d{17,20}$/.test(messageId)) {
        return interaction.reply({
          embeds: [errorEmbed('ID messaggio non valido. Deve essere un ID Discord (17-20 cifre).')],
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const deleted = await reactionRoleService.removePanel(interaction.guild.id, messageId);

      if (deleted === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('Nessun pannello trovato con quell\'ID messaggio.')],
        });
      }

      // Try to delete the original message too
      try {
        const panels = await reactionRoleService.listPanels(interaction.guild.id);
        // The panel is already removed from DB, so we need to find the channel from the message
        // We'll search channels for the message
        for (const ch of interaction.guild.channels.cache.values()) {
          if (ch.type === ChannelType.GuildText) {
            const msg = await ch.messages.fetch(messageId).catch(() => null);
            if (msg) {
              await msg.delete().catch(() => {});
              break;
            }
          }
        }
      } catch {
        // Ignore — DB entries are already removed
      }

      await recordAudit({
        guildId: interaction.guild.id,
        actorId: interaction.user.id,
        action: 'admin.reactionrole.remove',
        targetType: 'message',
        targetId: messageId,
        details: { deletedEntries: deleted },
      });

      return interaction.editReply({
        embeds: [successEmbed(`Pannello reaction role rimosso (${deleted} voci eliminate).`)],
      });
    }

    // --- LIST ---
    if (sub === 'list') {
      await interaction.deferReply({ flags: 64 });

      const panels = await reactionRoleService.listPanels(interaction.guild.id);

      if (panels.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('Nessun pannello reaction role trovato.')],
        });
      }

      const list = panels.map((p, i) => {
        const pairs = p.pairs.map((pair) => `${pair.emoji} → <@&${pair.roleId}>${pair.label ? ` (${pair.label})` : ''}`).join('\n');
        return `**${i + 1}.** [Messaggio](https://discord.com/channels/${interaction.guild.id}/${p.channelId}/${p.messageId})\n` +
          `  Canale: <#${p.channelId}> | ID: \`${p.messageId}\`\n` +
          `  ${pairs}`;
      }).join('\n\n');

      return interaction.editReply({
        embeds: [baseEmbed({
          title: `Pannelli Reaction Role (${panels.length})`,
          description: list,
          footer: { text: 'Bloods Community • Reaction Roles' },
        })],
      });
    }
  },
};
