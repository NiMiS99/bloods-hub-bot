// src/commands/admin/onboarding.js
// /onboarding — Posts a comprehensive command guide panel in the channel.
// Helps users discover all bot features at a glance.
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, baseEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('onboarding')
    .setDescription('Posta il pannello con la guida ai comandi del bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName('post').setDescription('Posta la guida comandi in questo canale'))
    .addSubcommand((sub) =>
      sub.setName('dm').setDescription('Invia la guida comandi in DM a un utente')
        .addUserOption((opt) => opt.setName('user').setDescription('Utente destinatario').setRequired(true))),

  async execute(interaction, _client) {
    if (!isAdmin(interaction.member)) {
      await interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'post') {
      const embed = buildCommandGuide();
      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ embeds: [successEmbed('Pannello guida comandi postato!')], flags: 64 });
      await recordAudit(interaction.guild.id, interaction.user.id, 'onboarding.post', { channel: interaction.channel.id });
    }

    else if (sub === 'dm') {
      const user = interaction.options.getUser('user');
      const embed = buildCommandGuide();
      try {
        await user.send({ embeds: [embed] });
        await interaction.reply({ embeds: [successEmbed(`Guida comandi inviata in DM a ${user.username}!`)], flags: 64 });
      } catch {
        await interaction.reply({ embeds: [errorEmbed(`Non posso inviare DM a ${user.username}. Ha i DM chiusi.`)], flags: 64 });
      }
    }
  },
};

function buildCommandGuide() {
  return baseEmbed('📋 Guida Comandi Bloods Bot')
    .setColor(0x8b0000)
    .setDescription(
      '**Il bot ha 61 comandi! Ecco i più utili per iniziare:**\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
    .addFields(
      { name: '👤 Profilo & Livelli', value: '`/mystats` — Tue statistiche\n`/rank` — Livello, XP, posizione\n`/rankcard` — Carta rank visiva\n`/profile` — Profilo completo\n`/daily` — Ricompensa giornaliera\n`/leaderboard` — Classifica community', inline: true },
      { name: '🎮 Gaming', value: '`/lfg` — Cerca gruppo\n`/music play` — Musica in vocale\n`/gamemeta` — Meta giochi\n`/mygames` — I tuoi giochi\n`/gameroles` — Seleziona giochi\n`/serverstats` — Stat server', inline: true },
      { name: '💬 Community', value: '`/suggest` — Proponi idea\n`/poll` — Crea sondaggio\n`/remind` — Promemoria\n`/birthday set` — Set compleanno\n`/tag` — Guide rapide\n`/event` — Eventi community', inline: true },
      { name: '🎵 Musica', value: '`/music play` — Riproduci\n`/music skip` — Salta\n`/music queue` — Coda\n`/music stop` — Ferma', inline: true },
      { name: '⚔️ WoW & Raid', value: '`/bp` — Sistema DKP\n`/loot` — Loot rolling\n`/spedizione` — Spedizioni\n`/raidreq` — Requisiti raid\n`/link battlenet` — Collega WoW', inline: true },
      { name: '❓ Aiuto', value: '`/help` — Lista completa\n`/ping` — Latenza bot\n`/serverinfo` — Info server\n`/members` — Lista membri', inline: true },
    )
    .addFields({
      name: '📌 Per iniziare',
      value: '1. Usa `/daily` ogni giorno per XP gratis\n2. Usa `/gameroles` per selezionare i tuoi giochi\n3. Entra in vocale e usa `/music play` per ascoltare musica\n4. Usa `/lfg` per trovare compagni di gioco\n5. Usa `/suggest` per proporre miglioramenti',
      inline: false,
    })
    .setFooter({ text: 'Bloods Hub · 61 comandi disponibili · Usa /help per la lista completa' })
    .setTimestamp();
}
