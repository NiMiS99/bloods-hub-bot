// src/commands/raidstatus.js
// /raidstatus — shows player's raid eligibility status.
// /raidcheck — Guida runs eligibility check on all members.
const { SlashCommandBuilder } = require('discord.js');
const { RaidEligibility, ExternalAccount } = require('../db');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { recordAudit } = require('../utils/auditLog');
const { isRaidLeader } = require('../utils/bpHelpers');
const { checkUser, checkAllMembers, getUserEligibility, getRaidConfig } = require('../services/raidEligibilityChecker');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidstatus')
    .setDescription('Stato idoneità raid.')

    .addSubcommand((sc) => sc.setName('me')
      .setDescription('Controlla la tua idoneità al raid (aggiorna da Blizzard API).'))
    .addSubcommand((sc) => sc.setName('check')
      .setDescription('Controlla tutti i membri gilda (solo Guida).'))
    .addSubcommand((sc) => sc.setName('list')
      .setDescription('Lista membri idonei/non idonei (solo Guida).')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const _guildId = interaction.guildId;

    if (sub === 'me') return this._me(interaction, client);
    if (sub === 'check') {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Solo le Guide possono usare questo comando.')], flags: 64 });
        return;
      }
      return this._check(interaction, client);
    }
    if (sub === 'list') {
      if (!isRaidLeader(interaction.member)) {
        await interaction.reply({ embeds: [errorEmbed('Solo le Guide possono usare questo comando.')], flags: 64 });
        return;
      }
      return this._list(interaction);
    }
  },

  async _me(interaction, _client) {
    await interaction.deferReply({ flags: 64 });

    const cfg = await getRaidConfig(interaction.guildId);
    const result = await checkUser(interaction.guildId, interaction.user.id, cfg);

    if (result.isEligible) {
      // Assign Progress role if configured and not already present
      let roleAssigned = false;
      let roleError = null;
      if (cfg.eligible_role_id) {
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id, { force: false });
          if (member && !member.roles.cache.has(cfg.eligible_role_id)) {
            await member.roles.add(cfg.eligible_role_id, 'Raid eligibility check passed');
            roleAssigned = true;
            logger.info(`Raid eligibility: assigned Progress role to ${interaction.user.tag} (${interaction.user.id})`);
          }
        } catch (err) {
          roleError = err.message;
          logger.warn(`Raid eligibility: failed to assign Progress role to ${interaction.user.id}: ${err.message}`);
        }
      }

      let msg = 'Sei **idoneo** al progress!';
      if (roleAssigned) {
        msg += '\n✅ Ti è stato assegnato il ruolo **@Progress**. Ora puoi vedere i canali raid e prenotarti su Raid-Helper.';
      } else if (roleError) {
        msg += `\n⚠️ Idoneo, ma non sono riuscito ad assegnarti il ruolo Progress (${roleError}). Contatta una Guida.`;
      } else {
        msg += '\nHai già il ruolo **@Progress**. Puoi prenotarti su Raid-Helper.';
      }

      await interaction.editReply({
        embeds: [successEmbed(msg)],
      });
      return;
    }

    // Check if it's a "no link" case
    const ext = await ExternalAccount.findOne({
      where: { user_id: interaction.user.id, guild_id: interaction.guildId, provider: 'battlenet' },
    });

    if (!ext) {
      await interaction.editReply({
        embeds: [errorEmbed(
          'Non hai collegato il tuo account Battle.net.\n' +
          'Usa `/link battlenet NomePersonaggio#1234` per collegarlo.\n' +
          'Dopo il collegamento, usa `/raidstatus me` per verificare la tua idoneità.'
        )],
      });
      return;
    }

    // Get the detailed eligibility from DB
    const elig = await getUserEligibility(interaction.guildId, interaction.user.id);
    const reasons = elig?.failure_reasons || result.failureReasons || ['Errore sconosciuto'];

    const embed = baseEmbed({
      title: 'Stato Idoneità Raid',
      description: ':x: **NON idoneo** al raid.',
      color: 0xed4245,
    });

    if (elig) {
      embed.addFields(
        { name: 'Personaggio', value: elig.character_name ? `**${elig.character_name}** (${elig.character_class || '?'})` : 'N/D', inline: false },
        { name: 'Ilvl equipaggiato', value: elig.ilvl_equipped ? `**${elig.ilvl_equipped}** / ${cfg.min_ilvl} richiesto` : 'N/D', inline: true },
        { name: 'Tier bonus', value: elig.has_tier_bonus ? `**${elig.tier_bonus_count}pc** ${elig.tierSetName || ''}` : 'No', inline: true },
        { name: 'Presenze raid', value: `**${elig.raid_attendance || 0}** / ${cfg.min_raid_attendance} richieste`, inline: true },
      );
    }

    embed.addFields({ name: 'Motivi non idoneità', value: reasons.join('\n'), inline: false });

    await interaction.editReply({ embeds: [embed] });
  },

  async _check(interaction, _client) {
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    const result = await checkAllMembers(guild);

    await interaction.editReply({
      embeds: [successEmbed(
        `Controllo completato!\n` +
        `**${result.eligible}** idonei · **${result.ineligible}** non idonei\n` +
        `**${result.promoted}** promossi a Progress · **${result.demoted}** rimossi da Progress\n` +
        `**${result.noLink}** senza account Battle.net collegato\n` +
        `Totale controllati: **${result.total}**`
      )],
    });
    await recordAudit(interaction, 'raidstatus.check', result);
  },

  async _list(interaction) {
    await interaction.deferReply({ flags: 64 });

    const all = await RaidEligibility.findAll({
      where: { guild_id: interaction.guildId },
      order: [['is_eligible', 'DESC'], ['ilvl_equipped', 'DESC']],
    });

    if (all.length === 0) {
      await interaction.editReply({ content: 'Nessun dato di idoneità. Usa `/raidstatus check` prima.' });
      return;
    }

    const eligible = all.filter((e) => e.is_eligible);
    const ineligible = all.filter((e) => !e.is_eligible);

    let text = `**Idonei (${eligible.length})**\n`;
    text += eligible.slice(0, 20).map((e) => `✅ <@${e.user_id}> — ${e.character_name || '?'} (ilvl ${e.ilvl_equipped || '?'})`).join('\n') || '_Nessuno_';

    text += `\n\n**Non idonei (${ineligible.length})**\n`;
    text += ineligible.slice(0, 20).map((e) => {
      const reasons = (e.failure_reasons || []).join('; ');
      return `❌ <@${e.user_id}> — ${e.character_name || 'N/D'} — ${reasons.slice(0, 80)}`;
    }).join('\n') || '_Nessuno_';

    if (text.length > 1900) text = text.slice(0, 1900) + '\n…';

    await interaction.editReply({ content: text });
  },
};
