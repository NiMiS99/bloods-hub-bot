// src/commands/poll.js
// Poll with DB persistence and automatic closure.
const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { Poll } = require('../db');
const logger = require('../utils/logger');

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crea un sondaggio con reazioni emoji e scadenza opzionale.')
    .addStringOption((o) => o.setName('domanda').setDescription('La domanda del sondaggio.').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione1').setDescription('Opzione 1.').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione2').setDescription('Opzione 2.').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione3').setDescription('Opzione 3.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione4').setDescription('Opzione 4.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione5').setDescription('Opzione 5.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione6').setDescription('Opzione 6.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione7').setDescription('Opzione 7.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione8').setDescription('Opzione 8.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione9').setDescription('Opzione 9.').setRequired(false).setMaxLength(200))
    .addStringOption((o) => o.setName('opzione10').setDescription('Opzione 10.').setRequired(false).setMaxLength(200))
    .addIntegerOption((o) =>
      o.setName('durata_ore').setDescription('Durata del sondaggio in ore (default: 24).').setRequired(false).setMinValue(1).setMaxValue(168)),

  async execute(interaction) {
    const question = interaction.options.getString('domanda');
    const durationHours = interaction.options.getInteger('durata_ore') || 24;
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`opzione${i}`);
      if (opt) options.push(opt);
    }

    if (options.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Servono almeno 2 opzioni.')], flags: 64 });
    }

    const description = options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n\n');
    const expiresAt = new Date(Date.now() + durationHours * 3600000);
    const expiresStr = expiresAt.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    const embed = baseEmbed({
      title: '📊 Sondaggio',
      description: `**${question}**\n\n${description}\n\n*Reagisci con l'emoji corrispondente per votare.*\n\n⏰ **Chiude:** <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
      footer: { text: `Sondaggio di ${interaction.user.tag} • Chiude ${expiresStr}` },
    });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    for (let i = 0; i < options.length; i++) {
      await message.react(EMOJIS[i]).catch(() => {});
    }

    // Save to DB
    await Poll.create({
      guild_id: interaction.guild.id,
      user_id: interaction.user.id,
      message_id: message.id,
      channel_id: interaction.channel.id,
      question,
      options: options.map((opt, i) => ({ emoji: EMOJIS[i], text: opt })),
      expires_at: expiresAt,
      is_closed: false,
    });

    // Schedule auto-close
    setTimeout(() => closePoll(interaction.client, interaction.guild.id, message.id), durationHours * 3600000);
  },
};

/**
 * Close a poll and announce results.
 */
async function closePoll(client, guildId, messageId) {
  try {
    const poll = await Poll.findOne({ where: { message_id: messageId, guild_id: guildId } });
    if (!poll || poll.is_closed) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const channel = guild.channels.cache.get(poll.channel_id);
    if (!channel) return;
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    // Count reactions
    const results = [];
    for (const opt of poll.options) {
      const reaction = message.reactions.cache.find((r) => r.emoji.name === opt.emoji);
      const count = reaction ? reaction.count - 1 : 0; // -1 for bot's own reaction
      results.push({ emoji: opt.emoji, text: opt.text, votes: Math.max(0, count) });
    }

    results.sort((a, b) => b.votes - a.votes);
    const winner = results[0];
    const totalVotes = results.reduce((a, r) => a + r.votes, 0);

    const resultsText = results.map((r, i) => {
      const pct = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
      const bar = '█'.repeat(Math.ceil(pct / 5)) + '░'.repeat(20 - Math.ceil(pct / 5));
      const medal = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      return `${medal} ${r.emoji} ${r.text}\n   \`${bar}\` ${r.votes} voti (${pct}%)`;
    }).join('\n\n');

    const { EmbedBuilder } = require('discord.js');
    const closedEmbed = new EmbedBuilder()
      .setTitle('📊 Sondaggio Chiuso')
      .setColor(0x8b0000)
      .setDescription(`**${poll.question}**\n\n${resultsText}\n\n🏆 **Vincitore:** ${winner.emoji} ${winner.text} (${winner.votes} voti)\n📋 **Voti totali:** ${totalVotes}`)
      .setFooter({ text: 'Sondaggio chiuso automaticamente' })
      .setTimestamp();

    await message.edit({ embeds: [closedEmbed], components: [] }).catch(() => {});
    await message.reactions.removeAll().catch(() => {});
    await channel.send({ content: `📊 **Sondaggio chiuso!** Vincitore: ${winner.emoji} ${winner.text}` }).catch(() => {});

    await poll.update({ is_closed: true });
    logger.info(`Poll ${messageId} closed. Winner: ${winner.text}`);
  } catch (err) {
    logger.error(`Poll close error: ${err.message}`);
  }
}

module.exports.closePoll = closePoll;
