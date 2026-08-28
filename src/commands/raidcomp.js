// src/commands/raidcomp.js
// /raidcomp — Suggests a raid composition based on online Bloods members
// and their linked WoW characters (class/spec from Blizzard API).
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ExternalAccount, User } = require('../db');
const { baseEmbed, errorEmbed } = require('../utils/embed');
const { fromFraktur } = require('../utils/textFormatter');
const logger = require('../utils/logger');

// Standard raid comp: 2 tanks, 4 healers, 14 DPS (20-man)
const IDEAL_COMP = {
  tanks: 2,
  healers: 4,
  dps: 14,
};

const TANK_CLASSES = ['Warrior', 'Paladin', 'Druid', 'Death Knight', 'Demon Hunter', 'Monk'];
const HEALER_CLASSES = ['Paladin', 'Priest', 'Druid', 'Monk', 'Shaman', 'Evoker'];
const DPS_CLASSES = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Druid', 'Demon Hunter', 'Monk', 'Evoker'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidcomp')
    .setDescription('Suggerisce una composizione raid basata sui player online (Bloods)')
    .addIntegerOption(opt =>
      opt.setName('raid_size').setDescription('Dimensione raid (10/20/25)').setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const raidSize = interaction.options.getInteger('raid_size') || 20;
    const guild = interaction.guild;
    await guild.members.fetch();

    // Get online Bloods members
    const bloodsRole = guild.roles.cache.find(r => r.name === 'Bloods');
    if (!bloodsRole) {
      return interaction.editReply({ embeds: [errorEmbed('Ruolo Bloods non trovato.')] });
    }

    const onlineMembers = bloodsRole.members.filter(m => m.presence?.status && m.presence.status !== 'offline');
    if (onlineMembers.size === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Nessun membro Bloods online.')] });
    }

    // Fetch linked WoW accounts for online members
    const memberIds = [...onlineMembers.keys()];
    const linked = await ExternalAccount.findAll({
      where: {
        provider: 'battlenet',
        user_id: memberIds,
      },
    });

    if (linked.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Nessun account WoW linkato tra i membri online. Usa `/link battlenet NomePG-Reame`.')] });
    }

    // Fetch class/spec from Blizzard API (cached in ExternalAccount or fetched)
    const players = [];
    const battleNetApi = client.battleNetApi || require('../services/api/battleNetApi');

    for (const acc of linked) {
      try {
        const profile = await battleNetApi.fetchProfile(acc.external_id, acc.region || 'eu');
        if (!profile) continue;
        const className = profile.character_class?.name || 'Unknown';
        const spec = profile.active_spec?.name || '';
        const role = this._guessRole(className, spec);
        players.push({
          discordId: acc.user_id,
          characterName: profile.name,
          className,
          spec,
          role,
          ilvl: profile.average_item_level || 0,
        });
      } catch (err) {
        // Skip individual failures
      }
    }

    if (players.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed('Impossibile recuperare i profili WoW. Verifica che i PG siano linkati correttamente.')] });
    }

    // Sort by ilvl (highest first)
    players.sort((a, b) => b.ilvl - a.ilvl);

    // Build composition
    const comp = { tanks: [], healers: [], dps: [] };
    const ideal = {
      tanks: Math.round(raidSize * 0.1),
      healers: Math.round(raidSize * 0.2),
      dps: raidSize - Math.round(raidSize * 0.1) - Math.round(raidSize * 0.2),
    };

    // First pass: assign by role preference
    for (const p of players) {
      if (comp.tanks.length < ideal.tanks && p.role === 'tank') {
        comp.tanks.push(p);
      } else if (comp.healers.length < ideal.healers && p.role === 'healer') {
        comp.healers.push(p);
      } else if (comp.dps.length < ideal.dps) {
        comp.dps.push(p);
      }
    }

    // Build embed
    const embed = baseEmbed({
      title: `⚔️ Composizione Raid Suggerita (${raidSize}-man)`,
      description:
        `**Player online Bloods:** ${onlineMembers.size}\n` +
        `**Con account WoW linkato:** ${players.length}\n` +
        `**Comp target:** ${ideal.tanks}T / ${ideal.healers}H / ${ideal.dps}DPS\n\n` +
        `**Comp attuale:** ${comp.tanks.length}T / ${comp.healers.length}H / ${comp.dps.length}DPS`,
    });

    // Tanks
    if (comp.tanks.length > 0) {
      embed.addFields({
        name: `🛡️ Tank (${comp.tanks.length}/${ideal.tanks})`,
        value: comp.tanks.map(p => `**${p.characterName}** — ${p.className} (${p.spec}) — ilvl ${p.ilvl}`).join('\n'),
      });
    }

    // Healers
    if (comp.healers.length > 0) {
      embed.addFields({
        name: `💚 Healer (${comp.healers.length}/${ideal.healers})`,
        value: comp.healers.map(p => `**${p.characterName}** — ${p.className} (${p.spec}) — ilvl ${p.ilvl}`).join('\n'),
      });
    }

    // DPS
    if (comp.dps.length > 0) {
      const dpsList = comp.dps.map(p => `**${p.characterName}** — ${p.className} (${p.spec}) — ilvl ${p.ilvl}`).join('\n');
      embed.addFields({
        name: `⚔️ DPS (${comp.dps.length}/${ideal.dps})`,
        value: dpsList.substring(0, 1024),
      });
    }

    // Missing roles
    const missing = {
      tanks: Math.max(0, ideal.tanks - comp.tanks.length),
      healers: Math.max(0, ideal.healers - comp.healers.length),
      dps: Math.max(0, ideal.dps - comp.dps.length),
    };

    if (missing.tanks > 0 || missing.healers > 0 || missing.dps > 0) {
      let missingStr = '';
      if (missing.tanks > 0) missingStr += `🛡️ ${missing.tanks} tank\n`;
      if (missing.healers > 0) missingStr += `💚 ${missing.healers} healer\n`;
      if (missing.dps > 0) missingStr += `⚔️ ${missing.dps} DPS\n`;
      embed.addFields({
        name: '❌ Ruoli mancanti',
        value: missingStr + '\n*Cerca pug o aspetta altri gildani.*',
      });
    }

    // Benches (players not in comp)
    const benched = players.filter(p =>
      !comp.tanks.includes(p) && !comp.healers.includes(p) && !comp.dps.includes(p)
    );
    if (benched.length > 0) {
      embed.addFields({
        name: ` bench (${benched.length})`,
        value: benched.map(p => `${p.characterName} — ${p.className} (${p.spec})`).join('\n').substring(0, 1024),
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },

  _guessRole(className, spec) {
    const tankSpecs = ['Protection', 'Guardian', 'Blood', 'Vengeance', 'Brewmaster'];
    const healerSpecs = ['Holy', 'Discipline', 'Restoration', 'Mistweaver', 'Preservation'];

    if (tankSpecs.some(s => spec.toLowerCase().includes(s.toLowerCase()))) return 'tank';
    if (healerSpecs.some(s => spec.toLowerCase().includes(s.toLowerCase()))) return 'healer';
    return 'dps';
  },
};
