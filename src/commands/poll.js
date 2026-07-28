// src/commands/poll.js
const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embed');

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crea un sondaggio con reazioni emoji.')
    .addStringOption((o) => o.setName('domanda').setDescription('La domanda del sondaggio.').setRequired(true))
    .addStringOption((o) => o.setName('opzione1').setDescription('Opzione 1.').setRequired(true))
    .addStringOption((o) => o.setName('opzione2').setDescription('Opzione 2.').setRequired(true))
    .addStringOption((o) => o.setName('opzione3').setDescription('Opzione 3.').setRequired(false))
    .addStringOption((o) => o.setName('opzione4').setDescription('Opzione 4.').setRequired(false))
    .addStringOption((o) => o.setName('opzione5').setDescription('Opzione 5.').setRequired(false))
    .addStringOption((o) => o.setName('opzione6').setDescription('Opzione 6.').setRequired(false))
    .addStringOption((o) => o.setName('opzione7').setDescription('Opzione 7.').setRequired(false))
    .addStringOption((o) => o.setName('opzione8').setDescription('Opzione 8.').setRequired(false))
    .addStringOption((o) => o.setName('opzione9').setDescription('Opzione 9.').setRequired(false))
    .addStringOption((o) => o.setName('opzione10').setDescription('Opzione 10.').setRequired(false)),

  async execute(interaction) {
    const question = interaction.options.getString('domanda');
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`opzione${i}`);
      if (opt) options.push(opt);
    }

    if (options.length < 2) {
      return interaction.reply({ embeds: [errorEmbed('Servono almeno 2 opzioni.')], flags: 64 });
    }

    const description = options.map((opt, i) => `${EMOJIS[i]} ${opt}`).join('\n\n');

    const embed = baseEmbed({
      title: `📊 Sondaggio`,
      description: `**${question}**\n\n${description}\n\n*Reagisci con l'emoji corrispondente per votare.*`,
      footer: { text: `Sondaggio di ${interaction.user.tag}` },
    });

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();

    for (let i = 0; i < options.length; i++) {
      await message.react(EMOJIS[i]).catch(() => {});
    }
  },
};
