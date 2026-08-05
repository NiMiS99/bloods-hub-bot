// src/commands/admin/restore.js
// /restore — Restore database from a backup file (admin only).
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embed');
const { isAdmin } = require('../../utils/permissions');
const { recordAudit } = require('../../utils/auditLog');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const logger = require('../../utils/logger');

const BACKUP_DIR = path.join(process.cwd(), 'backups');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Ripristina il database da un backup (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('Lista i backup disponibili'))
    .addSubcommand((sub) =>
      sub.setName('show').setDescription('Mostra i dettagli di un backup')
        .addStringOption((opt) =>
          opt.setName('file').setDescription('Nome del file backup').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('download').setDescription('Scarica un file backup')
        .addStringOption((opt) =>
          opt.setName('file').setDescription('Nome del file backup').setRequired(true))),

  async execute(interaction, _client) {
    if (!isAdmin(interaction.member)) {
      await interaction.reply({ embeds: [errorEmbed('Solo gli admin possono usare questo comando.')], flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'list') {
      await handleList(interaction);
    } else if (sub === 'show') {
      await handleShow(interaction);
    } else if (sub === 'download') {
      await handleDownload(interaction);
    }
  },
};

async function handleList(interaction) {
  await interaction.deferReply();

  if (!fs.existsSync(BACKUP_DIR)) {
    await interaction.editReply({ embeds: [errorEmbed('Nessun backup trovato.')] });
    return;
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && (f.endsWith('.sql.gz') || f.endsWith('.json.gz')))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    await interaction.editReply({ embeds: [errorEmbed('Nessun backup trovato.')] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle(`📋 Backup disponibili (${files.length})`)
    .setTimestamp();

  const fileList = files.slice(0, 20).map(f => {
    const size = (f.size / 1024 / 1024).toFixed(2);
    const date = f.mtime.toLocaleString('it-IT');
    return `\`${f.name}\` — ${size} MB — ${date}`;
  }).join('\n');

  embed.setDescription(fileList.substring(0, 4000));
  embed.setFooter({ text: 'Bloods Hub Bot' });

  await interaction.editReply({ embeds: [embed] });
}

async function handleShow(interaction) {
  const filename = interaction.options.getString('file');
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    await interaction.reply({ embeds: [errorEmbed('File non trovato.')] });
    return;
  }

  await interaction.deferReply();

  try {
    const compressed = fs.readFileSync(filepath);
    const decompressed = zlib.gunzipSync(compressed);
    const data = JSON.parse(decompressed.toString());

    const embed = new EmbedBuilder()
      .setColor(0x8b0000)
      .setTitle(`📊 Dettagli backup: ${filename}`)
      .addFields(
        { name: 'Esportato il', value: data._meta?.exported_at || 'Sconosciuto', inline: true },
        { name: 'Database', value: data._meta?.database || 'Sconosciuto', inline: true },
        { name: 'Tabelle', value: `${data._meta?.table_count || 0}`, inline: true },
        { name: 'Righe totali', value: `${data._meta?.total_rows || 0}`, inline: true },
        { name: 'Dimensione file', value: `${(compressed.length / 1024 / 1024).toFixed(2)} MB`, inline: true },
        { name: 'Tipo', value: filename.endsWith('.sql.gz') ? 'SQL (mysqldump)' : 'JSON (Sequelize)', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: 'Bloods Hub Bot' });

    // Top 10 tables by row count
    const tables = Object.entries(data.tables || {})
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);

    if (tables.length > 0) {
      const tableList = tables.map(([name, rows]) => `**${name}**: ${rows.length} righe`).join('\n');
      embed.addFields({ name: 'Top 10 tabelle', value: tableList.substring(0, 1024) });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error(`Restore show error: ${err.message}`);
    await interaction.editReply({ embeds: [errorEmbed(`Errore lettura backup: ${err.message}`)] });
  }
}

async function handleDownload(interaction) {
  const filename = interaction.options.getString('file');
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    await interaction.reply({ embeds: [errorEmbed('File non trovato.')] });
    return;
  }

  await interaction.deferReply();

  const stat = fs.statSync(filepath);
  if (stat.size > 25 * 1024 * 1024) {
    await interaction.editReply({ embeds: [errorEmbed('File troppo grande per il download Discord (max 25MB).')] });
    return;
  }

  const attachment = new AttachmentBuilder(filepath, { name: filename });

  await recordAudit({
    guildId: interaction.guild.id,
    actorId: interaction.user.id,
    action: 'backup.download',
    targetType: 'backup',
    targetId: filename,
  });

  await interaction.editReply({
    content: `📥 Backup scaricato: **${filename}** (${(stat.size / 1024 / 1024).toFixed(2)} MB)`,
    files: [attachment],
  });
}
