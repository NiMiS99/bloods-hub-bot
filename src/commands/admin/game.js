// src/commands/admin/game.js
// /game add|list|update — manage the games catalog (admin only).
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, PermissionsBitField } = require('discord.js');
const { Game } = require('../../db');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { toFraktur } = require('../../utils/textFormatter');
const { createGameCategory, createGameChannels } = require('../../utils/gameChannels');
const { refreshRolePanel } = require('../../ui/roleSelection');
const { recordAudit } = require('../../utils/auditLog');
const { isAdmin } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Gestisci il catalogo dei giochi.')
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Registra un nuovo gioco e crea la sua categoria privata + ruolo.')
        .addStringOption((o) => o.setName('code').setDescription('Slug stabile, es. "valorant".').setRequired(true))
        .addStringOption((o) => o.setName('name').setDescription('Nome visualizzato.').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('category')
            .setDescription('Genere')
            .setRequired(true)
            .addChoices(
              { name: 'MMO', value: 'mmo' },
              { name: 'FPS', value: 'fps' },
              { name: 'MOBA', value: 'moba' },
              { name: 'Strategy', value: 'strategy' },
              { name: 'Sandbox', value: 'sandbox' }
            )
        )
        .addStringOption((o) =>
          o
            .setName('api_provider')
            .setDescription('Provider API esterno')
            .setRequired(false)
            .addChoices(
              { name: 'Steam', value: 'steam' },
              { name: 'Battle.net', value: 'battlenet' },
              { name: 'Riot', value: 'riot' },
              { name: 'Manual', value: 'manual' },
              { name: 'None', value: 'none' }
            )
        )
        .addStringOption((o) => o.setName('icon_url').setDescription('URL icona per gli embed.').setRequired(false))
    )
    .addSubcommand((s) => s.setName('list').setDescription('Elenca tutti i giochi registrati.'))
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Disattiva un gioco (mantiene ruolo/categoria, ma lo nasconde dal pannello).')
        .addStringOption((o) => o.setName('code').setDescription('Codice del gioco').setRequired(true).setAutocomplete(true))
        .addBooleanOption((o) => o.setName('archive').setDescription('Se true, sposta la categoria in fondo e la nasconde (default: true).').setRequired(false))
    )
    .addSubcommand((s) =>
      s
        .setName('update')
        .setDescription('Aggiorna un gioco esistente (es. imposta id ruolo/categoria).')
        .addStringOption((o) => o.setName('code').setDescription('Codice del gioco').setRequired(true).setAutocomplete(true))
        .addRoleOption((o) => o.setName('role').setDescription('Ruolo Discord che concede l\'accesso.').setRequired(false))
        .addChannelOption((o) =>
          o.setName('category').setDescription('Canale categoria Discord.').addChannelTypes(ChannelType.GuildCategory).setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'update' || sub === 'remove') {
      const games = await Game.findAll();
      await interaction.respond(
        games
          .filter((g) => g.code.startsWith(interaction.options.getFocused()))
          .slice(0, 25)
          .map((g) => ({ name: g.name, value: g.code }))
      );
    }
  },

  async execute(interaction) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Non hai i permessi per usare questo comando. Serve il ruolo **Bloods Admin** o permessi Discord equivalenti.')],
        flags: 64,
      });
    }
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') return this._add(interaction);
    if (sub === 'list') return this._list(interaction);
    if (sub === 'remove') return this._remove(interaction);
    if (sub === 'update') return this._update(interaction);
  },

  async _add(interaction) {
    // Defer immediately — before any DB queries or Discord API calls — so
    // Discord knows the bot is processing and doesn't time out after 3s.
    await interaction.deferReply({ flags: 64 });

    const code = interaction.options.getString('code').toLowerCase();
    const name = interaction.options.getString('name');
    const category = interaction.options.getString('category');
    const apiProvider = interaction.options.getString('api_provider') ?? 'none';
    const iconUrl = interaction.options.getString('icon_url');

    if (await Game.findOne({ where: { code } })) {
      await interaction.editReply({ embeds: [errorEmbed(`Il codice gioco \`${code}\` esiste già.`)] });
      return;
    }

    // 1. Create the Discord role — standard readable name (e.g. "Valorant").
    const role = await interaction.guild.roles.create({
      name: name,
      mentionable: true,
      reason: `Auto-creato da /game add per ${name}`,
    });

    // 2. Create the private category with Fraktur name using shared template.
    const cat = await createGameCategory(interaction.guild, name, role.id);

    // 3. Create all channels from the standard template:
    //    #𝔤𝔢𝔫𝔢𝔯𝔞𝔩𝔢, #𝔫𝔢𝔴𝔰, #𝔠𝔬𝔪𝔲𝔫𝔦𝔠𝔞𝔷𝔦𝔬𝔫𝔦, #𝔠𝔬𝔪𝔭𝔬𝔰𝔦𝔷𝔦𝔬𝔫𝔦, 🔊𝔙𝔬𝔠𝔞𝔩𝔢 1, 🔊𝔙𝔬𝔠𝔞𝔩𝔢 2
    const { created: createdCh, skipped: skippedCh } = await createGameChannels(
      interaction.guild, cat.id, role.id, name
    );

    // 4. Persist to database.
    await Game.create({
      code,
      name,
      category,
      api_provider: apiProvider === 'none' ? null : apiProvider,
      role_id: role.id,
      category_id: cat.id,
      icon_url: iconUrl,
    });

    // 4b. Audit log.
    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'game.add',
      targetType: 'game',
      targetId: code,
      details: { name, role_id: role.id, category_id: cat.id, channels: createdCh },
    });

    // 5. Auto-refresh the role-selection panel so the new game appears immediately.
    let panelStatus = 'non aggiornato';
    try {
      const result = await refreshRolePanel(interaction.guild, interaction.client);
      if (result === 'edited') panelStatus = 'aggiornato in #𝔰𝔠𝔢𝔤𝔩𝔦-𝔤𝔦𝔬𝔠𝔥𝔦';
      else if (result === 'sent') panelStatus = 'creato in #𝔰𝔠𝔢𝔤𝔩𝔦-𝔤𝔦𝔬𝔠𝔥𝔦';
      else if (result === 'skipped') panelStatus = 'saltato (canale non configurato — usa /rolepanel)';
    } catch (err) {
      panelStatus = `errore: ${err.message}`;
    }

    await interaction.editReply({
      embeds: [
        successEmbed(
          `Aggiunto **${name}**.\n` +
            `Ruolo: <@&${role.id}>\n` +
            `Categoria: <#${cat.id}>\n` +
            `Canali creati (${createdCh.length}): ${createdCh.join(', ') || 'nessuno'}\n` +
            `Canali già esistenti (${skippedCh.length}): ${skippedCh.join(', ') || 'nessuno'}\n` +
            `Pannello selezione: ${panelStatus}`
        ),
      ],
    });
  },

  async _list(interaction) {
    const games = await Game.findAll({ order: [['name', 'ASC']] });
    if (!games.length) {
      await interaction.reply({ embeds: [errorEmbed('Nessun gioco registrato.')] });
      return;
    }
    const lines = games.map(
      (g) =>
        `• **${g.name}** (\`${g.code}\`) — ${g.category}${g.api_provider ? ` • ${g.api_provider}` : ''}` +
        `${g.role_id ? ` • <@&${g.role_id}>` : ''}${g.category_id ? ` • <#${g.category_id}>` : ''}` +
        `${g.is_active ? '' : ' • _inattivo_'}`
    );
    await interaction.reply({ embeds: [baseEmbed({ title: 'Giochi registrati', description: lines.join('\n') })] });
  },

  async _remove(interaction) {
    await interaction.deferReply({ flags: 64 });

    const code = interaction.options.getString('code');
    const archive = interaction.options.getBoolean('archive') ?? true;
    const game = await Game.findOne({ where: { code } });
    if (!game) {
      await interaction.editReply({ embeds: [errorEmbed(`Gioco sconosciuto: \`${code}\``)] });
      return;
    }
    if (code === 'wow') {
      await interaction.editReply({ embeds: [errorEmbed('Impossibile disattivare WoW — è il gioco legacy della gilda.')] });
      return;
    }

    // 1. Mark as inactive in DB (does NOT delete the row).
    await game.update({ is_active: false });

    // 1b. Audit log.
    await recordAudit({
      guildId: interaction.guild.id,
      actorId: interaction.user.id,
      action: 'game.remove',
      targetType: 'game',
      targetId: code,
      details: { name: game.name, archived: archive },
    });

    const log = [`**${game.name}** disattivato (is_active=false).`];

    // 2. Optionally archive the category: move to bottom + hide from @everyone.
    if (archive && game.category_id) {
      const cat = interaction.guild.channels.cache.get(game.category_id);
      if (cat) {
        // Deny ViewChannel for the game role too (hides it from members).
        if (game.role_id) {
          await cat.permissionOverwrites.edit(game.role_id, {
            ViewChannel: false,
          }).catch(() => {});
        }
        // Move category to bottom (highest position number).
        await cat.setPosition(100).catch(() => {});
        log.push(`Categoria <#${cat.id}> archiviata (nascosta, spostata in fondo).`);
      }
    }

    // 3. Refresh the role panel (game will no longer appear).
    let panelStatus = 'non aggiornato';
    try {
      const result = await refreshRolePanel(interaction.guild, interaction.client);
      if (result === 'edited') panelStatus = 'aggiornato';
      else if (result === 'sent') panelStatus = 'ricreato';
      else if (result === 'skipped') panelStatus = 'saltato';
    } catch (err) {
      panelStatus = `errore: ${err.message}`;
    }
    log.push(`Pannello selezione: ${panelStatus}`);

    await interaction.editReply({
      embeds: [successEmbed(log.join('\n'))],
    });
  },

  async _update(interaction) {
    const code = interaction.options.getString('code');
    const role = interaction.options.getRole('role');
    const category = interaction.options.getChannel('category');
    const game = await Game.findOne({ where: { code } });
    if (!game) {
      await interaction.reply({ embeds: [errorEmbed(`Gioco sconosciuto: \`${code}\``)], flags: 64 });
      return;
    }
    const updates = {};
    if (role) updates.role_id = role.id;
    if (category) updates.category_id = category.id;
    await game.update(updates);
    await interaction.reply({ embeds: [successEmbed(`${game.name} aggiornato.`)] });
  },
};
