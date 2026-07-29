// src/services/gameModeService.js
// Interactive panel for community private game servers.
// Posts an embed with buttons for each active server in #gamemode channel.
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');
const { GameMode } = require('../db');
const { baseEmbed } = require('../utils/embed');
const logger = require('../utils/logger');
const config = require('../config');

const GUILD_ID = config.discord.guildId || '1010226759817515018';
const CHANNEL_NAME = 'gamemode';

const STATUS_ICONS = {
  online: '🟢',
  offline: '🔴',
  maintenance: '🟡',
};

/**
 * Find or create the #gamemode channel.
 */
async function getGameModeChannel(guild) {
  let channel = [...guild.channels.cache.values()].find(
    (c) => c.name === CHANNEL_NAME && c.type === ChannelType.GuildText
  );
  if (!channel) {
    // Find the Community Hub category
    const category = [...guild.channels.cache.values()].find(
      (c) => c.type === ChannelType.GuildCategory && c.name && c.name.includes('𝖧𝗎𝖻')
    );
    channel = await guild.channels.create({
      name: CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: category?.id || null,
      topic: 'Server privati della community Bloods — seleziona un server per i dettagli di connessione.',
    });
    logger.info(`GameMode: created #${CHANNEL_NAME} channel.`);
  }
  return channel;
}

/**
 * Build the main gamemode panel embed + components.
 */
async function buildGameModePanel(guild) {
  const servers = await GameMode.findAll({
    where: { guild_id: guild.id, is_active: true },
    order: [['sort_order', 'ASC'], ['name', 'ASC']],
  });

  if (servers.length === 0) {
    return {
      embeds: [
        baseEmbed({
          title: 'Server Privati Community',
          description:
            '**Nessun server disponibile al momento.**\n\n' +
            'I server privati della community Bloods appariranno qui.\n' +
            'Un admin può aggiungere server con `/gamemode add`.',
        }),
      ],
      components: [],
    };
  }

  // Build embed with server list
  const fields = servers.map((s) => ({
    name: `${STATUS_ICONS[s.status] || '⚪'} ${s.name}`,
    value:
      `**Gioco:** ${s.game_name}\n` +
      `**Stato:** ${s.status === 'online' ? 'Online' : s.status === 'maintenance' ? 'Manutenzione' : 'Offline'}\n` +
      (s.version ? `**Versione:** ${s.version}\n` : '') +
      (s.max_players ? `**Slots:** ${s.current_players}/${s.max_players}\n` : '') +
      (s.description ? `**Info:** ${s.description.slice(0, 200)}\n` : '') +
      `*Clicca il pulsante per i dettagli di connessione.*`,
    inline: false,
  }));

  const embed = new EmbedBuilder()
    .setTitle('Server Privati Community')
    .setColor(0x8b0000)
    .setDescription(
      '**Benvenuto nella sezione Server Privati della community Bloods!**\n\n' +
      'Qui trovi tutti i server privati messi a disposizione dalla community.\n' +
      'Clicca sul pulsante di un server per vedere le **istruzioni di connessione** complete.\n\n' +
      `**Server attivi:** ${servers.length}`
    )
    .addFields(fields.slice(0, 25)) // Discord embed field limit
    .setTimestamp()
    .setFooter({ text: 'Bloods Community • Server Privati' });

  // Build buttons (max 5 per row, max 5 rows = 25 buttons)
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let buttonsInRow = 0;

  for (const s of servers.slice(0, 25)) {
    const style = s.status === 'online' ? ButtonStyle.Success : s.status === 'maintenance' ? ButtonStyle.Secondary : ButtonStyle.Danger;
    const label = s.name.length > 20 ? s.name.slice(0, 18) + '..' : s.name;
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`gamemode:details:${s.id}`)
        .setLabel(label)
        .setStyle(style)
    );
    buttonsInRow++;
    if (buttonsInRow === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonsInRow = 0;
    }
  }
  if (buttonsInRow > 0) rows.push(currentRow);

  return { embeds: [embed], components: rows };
}

/**
 * Build a detailed server info embed (shown when a button is clicked).
 */
async function buildServerDetails(serverId, _guild) {
  const server = await GameMode.findByPk(serverId);
  if (!server || !server.is_active) {
    return {
      embeds: [new EmbedBuilder().setTitle('Server non trovato').setColor(0xed4245).setDescription('Questo server non è più disponibile.')],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('gamemode:back').setLabel('Indietro').setStyle(ButtonStyle.Secondary)
        ),
      ],
    };
  }

  const statusText = server.status === 'online' ? '🟢 Online' : server.status === 'maintenance' ? '🟡 In Manutenzione' : '🔴 Offline';

  const embed = new EmbedBuilder()
    .setTitle(`${STATUS_ICONS[server.status]} ${server.name}`)
    .setColor(server.color_hex || 0x8b0000)
    .setDescription(server.description || 'Nessuna descrizione disponibile.')
    .addFields(
      { name: 'Gioco', value: server.game_name, inline: true },
      { name: 'Stato', value: statusText, inline: true },
      { name: 'Versione', value: server.version || 'N/A', inline: true },
    );

  if (server.connect_info) {
    embed.addFields({
      name: 'Come Connettersi',
      value: `\`\`\`\n${server.connect_info}\n\`\`\``,
      inline: false,
    });
  }

  if (server.connect_url) {
    embed.addFields({
      name: 'Link',
      value: `[Clicca qui per connetterti](${server.connect_url})`,
      inline: false,
    });
  }

  if (server.max_players) {
    embed.addFields({
      name: 'Slots',
      value: `${server.current_players}/${server.max_players} giocatori`,
      inline: true,
    });
  }

  if (server.image_url) {
    embed.setImage(server.image_url);
  }

  embed.setTimestamp()
    .setFooter({ text: 'Bloods Community • Server Privati' });

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gamemode:back').setLabel('Indietro').setStyle(ButtonStyle.Secondary),
    ),
  ];

  return { embeds: [embed], components };
}

/**
 * Post or update the gamemode panel in #gamemode.
 */
async function postGameModePanel(client) {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const channel = await getGameModeChannel(guild);
    const payload = await buildGameModePanel(guild);

    // Find existing panel message (from guide_messages or by scanning)
    const { GuideMessage } = require('../db');
    const existing = await GuideMessage.findOne({
      where: { guild_id: guild.id, channel_id: channel.id, guide_type: 'gamemode_panel' },
    });

    if (existing) {
      try {
        const msg = await channel.messages.fetch(existing.message_id);
        await msg.edit(payload);
        logger.info('GameMode: panel updated.');
        return;
      } catch {
        // Message deleted, create new
      }
    }

    const sent = await channel.send(payload);
    await GuideMessage.create({
      guild_id: guild.id,
      channel_id: channel.id,
      message_id: sent.id,
      guide_type: 'gamemode_panel',
    });
    logger.info('GameMode: panel posted.');
  } catch (err) {
    logger.error(`GameMode postPanel failed: ${err.message}`);
  }
}

module.exports = { postGameModePanel, buildGameModePanel, buildServerDetails, getGameModeChannel };
