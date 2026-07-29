// src/commands/birthday.js
// /birthday — set, remove, view, and list user birthdays.
const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const birthdayService = require('../services/birthdayService');

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/**
 * Get the max day for a given month (non-leap-safe for Feb, uses 29 max).
 * @param {number} month - 1-12
 * @returns {number}
 */
function maxDayForMonth(month) {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Gestisci il tuo compleanno nella community.')
    .addSubcommand((sc) =>
      sc.setName('set').setDescription('Imposta il tuo compleanno.')
        .addIntegerOption((o) =>
          o.setName('month').setDescription('Mese (1-12).').setRequired(true).setMinValue(1).setMaxValue(12))
        .addIntegerOption((o) =>
          o.setName('day').setDescription('Giorno (1-31).').setRequired(true).setMinValue(1).setMaxValue(31)))
    .addSubcommand((sc) =>
      sc.setName('remove').setDescription('Rimuove il tuo compleanno.'))
    .addSubcommand((sc) =>
      sc.setName('view').setDescription('Mostra il compleanno di un utente.')
        .addUserOption((o) => o.setName('user').setDescription('Utente (tu per default).').setRequired(false)))
    .addSubcommand((sc) =>
      sc.setName('list').setDescription('Lista i prossimi compleanni.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // --- SET ---
    if (sub === 'set') {
      const month = interaction.options.getInteger('month');
      const day = interaction.options.getInteger('day');

      // Validate day for the given month
      const maxDay = maxDayForMonth(month);
      if (day > maxDay) {
        return interaction.reply({
          embeds: [errorEmbed(`Il mese ${MONTHS[month - 1]} ha al massimo ${maxDay} giorni.`)],
          flags: 64,
        });
      }

      const result = await birthdayService.setBirthday(
        interaction.guild.id,
        interaction.user.id,
        month,
        day
      );

      if (!result) {
        return interaction.reply({
          embeds: [errorEmbed('Impossibile salvare il compleanno. Riprova più tardi.')],
          flags: 64,
        });
      }

      return interaction.reply({
        embeds: [successEmbed(
          `Compleanno impostato: **${day} ${MONTHS[month - 1]}**.\n` +
          `Riceverai gli auguri dalla community nel tuo giorno speciale!`
        )],
        flags: 64,
      });
    }

    // --- REMOVE ---
    if (sub === 'remove') {
      const removed = await birthdayService.removeBirthday(interaction.guild.id, interaction.user.id);

      if (!removed) {
        return interaction.reply({
          embeds: [errorEmbed('Non hai un compleanno impostato.')],
          flags: 64,
        });
      }

      return interaction.reply({
        embeds: [successEmbed('Il tuo compleanno è stato rimosso.')],
        flags: 64,
      });
    }

    // --- VIEW ---
    if (sub === 'view') {
      const target = interaction.options.getUser('user') || interaction.user;

      const birthday = await birthdayService.getBirthday(interaction.guild.id, target.id);

      if (!birthday) {
        return interaction.reply({
          embeds: [errorEmbed(
            target.id === interaction.user.id
              ? 'Non hai ancora impostato il tuo compleanno. Usa `/birthday set` per farlo.'
              : `${target.username} non ha impostato il proprio compleanno.`
          )],
          flags: 64,
        });
      }

      const monthName = MONTHS[birthday.birth_month - 1];
      const now = new Date();
      let nextYear = now.getFullYear();
      if (birthday.birth_month < now.getMonth() + 1 ||
          (birthday.birth_month === now.getMonth() + 1 && birthday.birth_day < now.getDate())) {
        nextYear = now.getFullYear() + 1;
      }
      const nextDate = new Date(nextYear, birthday.birth_month - 1, birthday.birth_day);
      const timestamp = Math.floor(nextDate.getTime() / 1000);

      return interaction.reply({
        embeds: [baseEmbed({
          title: `Compleanno di ${target.username}`,
          description:
            `:birthday: **${birthday.birth_day} ${monthName}**\n\n` +
            `Prossimo compleanno: <t:${timestamp}:F> (<t:${timestamp}:R>)`,
          thumbnail: target.displayAvatarURL({ size: 128 }),
          footer: { text: 'Bloods Community • Compleanni' },
        })],
      });
    }

    // --- LIST ---
    if (sub === 'list') {
      await interaction.deferReply();

      const upcoming = await birthdayService.listUpcoming(interaction.guild.id, 10);

      if (upcoming.length === 0) {
        return interaction.editReply({
          embeds: [errorEmbed('Nessun compleanno registrato. Usa `/birthday set` per aggiungerne uno.')],
        });
      }

      const list = upcoming.map((item, i) => {
        const b = item.birthday;
        const monthName = MONTHS[b.birth_month - 1];
        const timestamp = Math.floor(item.nextDate.getTime() / 1000);
        return `**${i + 1}.** <@${b.user_id}> — ${b.birth_day} ${monthName}\n` +
          `  <t:${timestamp}:R> (<t:${timestamp}:D>)`;
      }).join('\n\n');

      return interaction.editReply({
        embeds: [baseEmbed({
          title: 'Prossimi compleanni',
          description: list,
          footer: { text: 'Bloods Community • Compleanni' },
        })],
      });
    }
  },
};
