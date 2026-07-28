// src/ui/spedizioneInteractions.js
// Handles select-menu (class/spec) and button (unsub) interactions for WoW spedizioni.
const { MessageFlags } = require('discord.js');
const { WowEvent, WowEventSignup, RaidConfig, RaidEligibility, sequelize } = require('../db');
const spedizioneCmd = require('../commands/spedizione');
const { findClassByKey, buildSpecMenu, buildClassMenu, buildUnsubButton, refreshEventMessage, buildEventEmbed } = spedizioneCmd;
const { checkUser, getRaidConfig } = require('../services/raidEligibilityChecker');

/**
 * Check if user is raid-eligible before allowing signup.
 * Returns { eligible: boolean, reasons: string[] }
 */
async function checkRaidEligibility(guildId, userId) {
  const cfg = await getRaidConfig(guildId);
  if (!cfg) return { eligible: true, reasons: [] }; // no config = no restrictions

  // Check cached eligibility first
  const cached = await RaidEligibility.findOne({ where: { guild_id: guildId, user_id: userId } });
  if (cached && cached.last_checked_at) {
    const ageHours = (Date.now() - new Date(cached.last_checked_at).getTime()) / (1000 * 60 * 60);
    if (ageHours < 6) {
      // Cache is fresh — use it
      return { eligible: cached.is_eligible, reasons: cached.failure_reasons || [] };
    }
  }

  // Cache stale or missing — run fresh check
  const result = await checkUser(guildId, userId, cfg);
  return { eligible: result.isEligible, reasons: result.failureReasons || [] };
}

async function handleSelectMenu(interaction, client, action, payload) {
  // action = "class" | "spec"
  if (action === 'class') {
    const eventId = payload[0];
    const classKey = interaction.values?.[0];
    const cls = findClassByKey(classKey);
    if (!cls) {
      await interaction.reply({ content: 'Classe non valida.', flags: 64 });
      return;
    }

    const evt = await WowEvent.findByPk(eventId);
    if (!evt || (evt.status || 'open') !== 'open') {
      await interaction.reply({ content: 'Spedizione non valida o non aperta.', flags: 64 });
      return;
    }

    const specMenu = buildSpecMenu(eventId, classKey);
    await interaction.reply({
      content: `Hai scelto **${cls.name}**. Ora seleziona la specializzazione:`,
      components: specMenu ? [specMenu] : [],
      flags: 64,
    });
    return;
  }

  if (action === 'spec') {
    // payload = [eventId, classKey]
    const eventId = payload[0];
    const classKey = payload[1];
    const spec = interaction.values?.[0];
    const cls = findClassByKey(classKey);
    if (!cls || !cls.specs.includes(spec)) {
      await interaction.reply({ content: 'Spec non valida.', flags: 64 });
      return;
    }

    const userId = interaction.user.id;
    const evt = await WowEvent.findByPk(eventId);
    if (!evt) {
      await interaction.reply({ content: 'Spedizione non trovata.', flags: 64 });
      return;
    }
    if ((evt.status || 'open') !== 'open') {
      await interaction.reply({ content: 'Spedizione chiusa.', flags: 64 });
      return;
    }

    // Raid eligibility check — block signup if not eligible
    const elig = await checkRaidEligibility(interaction.guildId, userId);
    if (!elig.eligible) {
      const reasons = elig.reasons.length > 0 ? '\n' + elig.reasons.map((r) => `• ${r}`).join('\n') : '';
      await interaction.reply({
        content:
          `:x: **Non sei idoneo al raid.** Non puoi iscriverti.\n` +
          `Usa \`/raidstatus me\` per verificare i tuoi requisiti.${reasons}`,
        flags: 64,
      });
      return;
    }

    // Check cap + upsert in transaction (anti race condition)
    const t = await sequelize.transaction();
    try {
      const existing = await WowEventSignup.findOne({ where: { event_id: eventId, user_id: userId }, transaction: t });
      if (!existing && evt.slots > 0) {
        const count = await WowEventSignup.count({ where: { event_id: eventId }, transaction: t, lock: t.LOCK.UPDATE });
        if (count >= evt.slots) {
          await t.rollback();
          await interaction.reply({ content: `Spedizione piena (max ${evt.slots}).`, flags: 64 });
          return;
        }
      }

      // Upsert signup
      await WowEventSignup.upsert({
        event_id: eventId,
        guild_id: interaction.guildId,
        user_id: userId,
        class_key: classKey,
        class_name: cls.name,
        spec,
      }, { transaction: t });

      await t.commit();
    } catch (err) {
      await t.rollback();
      await interaction.reply({ content: `Errore iscrizione: ${err.message}`, flags: 64 });
      return;
    }

    await refreshEventMessage(evt, client);
    await interaction.reply({ content: `Iscrizione registrata: **${cls.name}** (${spec}).`, flags: 64 });
    return;
  }
}

async function handleButton(interaction, client, action, payload) {
  if (action === 'unsub') {
    const eventId = payload[0];
    const userId = interaction.user.id;

    const evt = await WowEvent.findByPk(eventId);
    if (!evt) {
      await interaction.reply({ content: 'Spedizione non trovata.', flags: 64 });
      return;
    }

    const existing = await WowEventSignup.findOne({ where: { event_id: eventId, user_id: userId } });
    if (!existing) {
      await interaction.reply({ content: 'Non sei iscritto a questa spedizione.', flags: 64 });
      return;
    }

    await existing.destroy();
    await refreshEventMessage(evt, client);
    await interaction.reply({ content: 'Iscrizione rimossa.', flags: 64 });
    return;
  }
}

module.exports = { handleSelectMenu, handleButton };
