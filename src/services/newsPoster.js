// src/services/newsPoster.js
// Posts new game meta entries (patch notes, server status, etc.) into the
// corresponding game's #news channel. Runs after MetaScheduler fetches data.
// Tracks which entries have already been posted to avoid duplicates.
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Game, GameMeta } = require('../db');
const logger = require('../utils/logger');
const { toFraktur: _toFraktur, fromFraktur } = require('../utils/textFormatter');
const config = require('../config');

// In-memory set of posted GameMeta IDs (cleared on restart, dedup is also in DB)
const postedMetaIds = new Set();

class NewsPoster {
  constructor(client) {
    this.client = client;
    this.task = null;
  }

  start() {
    // Run every 30 minutes — checks for new meta entries and posts them
    this.task = cron.schedule('*/30 * * * *', () => this.run().catch((e) => logger.error('news poster:', e)));
    logger.info('NewsPoster started (every 30min).');
    // Also run once 60 seconds after startup
    setTimeout(() => this.run().catch((e) => logger.error('news poster initial:', e))), 60000;
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async run() {
    const games = await Game.findAll({ where: { is_active: true } });
    let totalPosted = 0;

    for (const game of games) {
      try {
        if (!game.category_id) continue;

        // Find unposted meta entries (last 24h, not yet posted)
        const newEntries = await GameMeta.findAll({
          where: {
            game_id: game.id,
            posted_to_channel: false,
            fetched_at: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) },
          },
          order: [['fetched_at', 'ASC']],
        });

        if (newEntries.length === 0) continue;

        // Find the news channel for this game
        const guild = this.client.guilds.cache.get(config.discord.guildId || '1010226759817515018');
        if (!guild) continue;

        await guild.channels.fetch();
        const category = guild.channels.cache.get(game.category_id);
        if (!category) continue;

        const newsChannel = [...guild.channels.cache.values()].find(
          (c) => c.parentId === category.id && (c.name.includes('📰') || fromFraktur(c.name).toLowerCase().includes('news'))
        );

        if (!newsChannel) {
          logger.warn(`No #news channel found for ${game.name}`);
          continue;
        }

        for (const entry of newEntries) {
          try {
            await this._postNewsEntry(newsChannel, game, entry);
            entry.posted_to_channel = true;
            await entry.save();
            postedMetaIds.add(entry.id);
            totalPosted++;
          } catch (err) {
            logger.error(`Failed to post news for ${game.code}: ${err.message}`);
          }
        }
      } catch (err) {
        logger.warn(`news poster error for ${game.code}: ${err.message}`);
      }
    }

    if (totalPosted > 0) {
      logger.info(`NewsPoster: posted ${totalPosted} new entr${totalPosted === 1 ? 'y' : 'ies'} to game channels.`);
    }
  }

  async _postNewsEntry(channel, game, entry) {
    const { EmbedBuilder } = require('discord.js');

    const kindEmoji = {
      patch: '🔧',
      meta: '📊',
      server_status: '🌐',
      event: '🎉',
      news: '📰',
    };
    const kindLabel = {
      patch: 'Patch Notes',
      meta: 'Meta Update',
      server_status: 'Stato Server',
      event: 'Evento',
      news: 'News',
    };

    const emoji = kindEmoji[entry.kind] || '📰';
    const label = kindLabel[entry.kind] || entry.kind;

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${game.name} — ${label}`)
      .setColor(game.color_hex || 0x8b0000)
      .setDescription(entry.body || entry.title)
      .setTimestamp(new Date(entry.fetched_at))
      .setFooter({ text: `Bloods Hub • ${game.name}` });

    if (entry.url) {
      embed.setURL(entry.url);
      embed.addFields({ name: '🔗 Fonte', value: entry.url });
    }

    if (game.icon_url) {
      embed.setThumbnail(game.icon_url);
    }

    // Mention the game role
    const content = game.role_id ? `<@&${game.role_id}>` : '';

    await channel.send({ content, embeds: [embed] });
  }

  /**
   * Manually trigger a post for a specific game (used by /gametest command).
   */
  async postForGame(gameCode) {
    const game = await Game.findOne({ where: { code: gameCode, is_active: true } });
    if (!game) return { error: 'Gioco non trovato' };

    const entries = await GameMeta.findAll({
      where: { game_id: game.id },
      order: [['fetched_at', 'DESC']],
      limit: 3,
    });

    if (entries.length === 0) return { error: 'Nessuna news in cache per questo gioco' };

    const guild = this.client.guilds.cache.get(config.discord.guildId || '1010226759817515018');
    if (!guild) return { error: 'Guild non trovata' };

    await guild.channels.fetch();
    const category = guild.channels.cache.get(game.category_id);
    if (!category) return { error: 'Categoria non trovata' };

    const newsChannel = [...guild.channels.cache.values()].find(
      (c) => c.parentId === category.id && (c.name.includes('📰') || fromFraktur(c.name).toLowerCase().includes('news'))
    );

    if (!newsChannel) return { error: 'Canale news non trovato' };

    let posted = 0;
    for (const entry of entries) {
      await this._postNewsEntry(newsChannel, game, entry);
      posted++;
    }

    return { posted, channel: newsChannel.name };
  }
}

module.exports = NewsPoster;
