// src/commands/gow.js
// /gow — Guilds of WoW integration commands
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const gowService = require('../services/gowService');
const { GameStat } = require('../db');
const logger = require('../utils/logger');

const GOW_PAGE = 'https://guildsofwow.com/bloods';
const GOW_MANAGE_API = 'https://guildsofwow.com/manage/api';
const GOW_MANAGE_SHEETS = 'https://guildsofwow.com/manage/spreadsheet';
const GOW_RECRUITMENT = 'https://guildsofwow.com/bloods/recruitment';

const command = new SlashCommandBuilder()
  .setName('gow')
  .setDescription('Guilds of WoW — integrazione gilda')
  .addSubcommand((sc) =>
    sc.setName('status').setDescription('Stato integrazione GoW (API, sheets, page)')
  )
  .addSubcommand((sc) =>
    sc.setName('roster').setDescription('Sincronizza roster da GoW (richiede API attiva)')
  )
  .addSubcommand((sc) =>
    sc.setName('recruitment').setDescription('Controlla candidature su GoW')
  )
  .addSubcommand((sc) =>
    sc.setName('links').setDescription('Link utili GoW (pagina, manage API, sheets, recruitment)')
  );

async function execute(interaction, client) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'status') {
    const apiEnabled = gowService.isEnabled();
    const embed = new EmbedBuilder()
     setTitle('Guilds of WoW — Stato Integrazione')
      .setColor(apiEnabled ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'API Key', value: apiEnabled ? 'Configurata (verificare su GoW)' : 'Non configurata', inline: true },
        { name: 'API Status', value: apiEnabled ? 'Da testare (403 Cloudflare?)' : 'N/D', inline: true },
        { name: 'Pagina Gilda', value: `[bloods](${GOW_PAGE})`, inline: true },
        { name: 'Google Sheets', value: 'Da configurare su GoW', inline: true },
        { name: 'Recruitment', value: `[Apri](${GOW_RECRUITMENT})`, inline: true },
        { name: 'Discord Bot GoW', value: 'Non integrato (opzionale)', inline: true }
      )
      .setFooter({ text: 'Bloods Community • /gow' });

    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (sub === 'roster') {
    await interaction.deferReply({ flags: 64 });
    if (!gowService.isEnabled()) {
      await interaction.editReply({ content: 'GoW API non configurata. Vai su https://guildsofwow.com/manage/api per ottenere la management API key.' });
      return;
    }
    const result = await gowService.syncRosterToDb({ GameStat });
    if (result.synced === 0) {
      await interaction.editReply({ content: 'Nessun membro sincronizzato. Possibile errore API (403 Cloudflare). Verifica la management API key su https://guildsofwow.com/manage/api' });
      return;
    }
    await interaction.editReply({ content: `Roster sincronizzato: **${result.synced}** membri, **${result.errors}** errori.` });
    return;
  }

  if (sub === 'recruitment') {
    await interaction.deferReply({ flags: 64 });
    if (!gowService.isEnabled()) {
      await interaction.editReply({ content: 'GoW API non configurata. Vai su https://guildsofwow.com/manage/api' });
      return;
    }
    const apps = await gowService.fetchRecruitmentApplications();
    if (apps.length === 0) {
      await interaction.editReply({ content: 'Nessuna candidatura trovata (o API non raggiungibile). Controlla su ' + GOW_RECRUITMENT });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle(`Candidature GoW (${apps.length})`)
      .setColor(0x8b0000)
      .setDescription(
        apps.slice(0, 10).map((a) =>
          `**${a.name || a.characterName || '?'}** — ${a.class || '?'} ${a.spec || ''} (ilvl ${a.ilvl || '?'})\n${a.message || ''}`
        ).join('\n\n')
      )
      .setFooter({ text: 'Bloods Community • /gow recruitment' });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (sub === 'links') {
    const embed = new EmbedBuilder()
      .setTitle('Guilds of WoW — Link Utili')
      .setColor(0x8b0000)
      .addFields(
        { name: 'Pagina Gilda', value: GOW_PAGE, inline: false },
        { name: 'Manage API', value: GOW_MANAGE_API, inline: false },
        { name: 'Manage Spreadsheets', value: GOW_MANAGE_SHEETS, inline: false },
        { name: 'Recruitment', value: GOW_RECRUITMENT, inline: false },
        { name: 'Help Center', value: 'https://help.guildsofwow.com', inline: false },
        { name: 'Discord GoW', value: 'https://discord.gg/guildsofwow', inline: false }
      )
      .setFooter({ text: 'Bloods Community • /gow' });
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }
}

module.exports = { data: command, execute };
