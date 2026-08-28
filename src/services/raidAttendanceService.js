// src/services/raidAttendanceService.js
// Awards BP automatically based on raid attendance.
// Two modes:
//   1. Automatic: checks who is in the raid voice channel at raid time + 15min
//   2. Manual: RL runs /raidattendance mark after raid to mark present users
//
// BP awards (configurable via RaidConfig):
//   Presence: +10 BP
//   Punctuality (online 15 min before): +5 BP
//   Kill boss Normal: +5, Heroic: +10, Mythic: +20
//   Wipe night (no kill): +8
//   No-show (raider mitico, not in voice): -15
const { Op } = require('sequelize');
const { BpUser, RaidAttendance, RaidConfig } = require('../db');
const logger = require('../utils/logger');
const { fromFraktur } = require('../utils/textFormatter');
const config = require('../config');

const BP_REWARDS = {
  presence: 10,
  punctuality: 5,
  killNormal: 5,
  killHeroic: 10,
  killMythic: 20,
  wipeNight: 8,
  noShow: -15,
};

class RaidAttendanceService {
  constructor(client) {
    this.client = client;
  }

  /**
   * Mark attendance for a raid session and award BP.
   * Called by /raidattendance command (manual) or by auto-check.
   *
   * @param {string} guildId
   * @param {string} raidName - e.g. "The Venomous Abyss"
   * @param {Date} raidDate
   * @param {Array<{userId: string, attended: boolean, punctual: boolean}>} attendees
   * @param {string} notedBy - userId of the RL/officer
   * @param {Object} kills - { normal: 0, heroic: 0, mythic: 0 }
   * @returns {Object} summary
   */
  async markAttendance(guildId, raidName, raidDate, attendees, notedBy, kills = {}) {
    const dateStr = raidDate.toISOString().split('T')[0];
    const results = { marked: 0, bpAwarded: 0, errors: [] };

    for (const att of attendees) {
      try {
        // Upsert attendance record
        const [record, created] = await RaidAttendance.findOrCreate({
          where: {
            guild_id: guildId,
            user_id: att.userId,
            raid_date: dateStr,
            raid_name: raidName,
          },
          defaults: {
            attended: att.attended,
            noted_by: notedBy,
          },
        });

        if (!created) {
          // Update existing record
          record.attended = att.attended;
          record.noted_by = notedBy;
          await record.save();
        }

        results.marked++;

        // Award BP if attended
        if (att.attended) {
          let bp = BP_REWARDS.presence;
          if (att.punctual) bp += BP_REWARDS.punctuality;

          // Kill bonuses (split among attendees)
          if (kills.normal > 0) bp += kills.normal * BP_REWARDS.killNormal;
          if (kills.heroic > 0) bp += kills.heroic * BP_REWARDS.killHeroic;
          if (kills.mythic > 0) bp += kills.mythic * BP_REWARDS.killMythic;

          // Wipe night bonus (no kills at all)
          if (kills.normal === 0 && kills.heroic === 0 && kills.mythic === 0) {
            bp += BP_REWARDS.wipeNight;
          }

          await this._addBp(guildId, att.userId, bp);
          results.bpAwarded += bp;
        } else {
          // No-show penalty (only for raider mitico — check is done by caller)
          if (att.penalizeNoShow) {
            await this._addBp(guildId, att.userId, BP_REWARDS.noShow);
            results.bpAwarded += BP_REWARDS.noShow;
          }
        }
      } catch (err) {
        results.errors.push(`${att.userId}: ${err.message}`);
        logger.error(`RaidAttendance: error marking ${att.userId}: ${err.message}`);
      }
    }

    logger.info(`RaidAttendance: marked ${results.marked} attendees, ${results.bpAwarded} BP awarded for ${raidName} ${dateStr}`);

    // Post raid recap to announcements channel
    await this._postRecap(guildId, raidName, raidDate, attendees, kills, results);

    return results;
  }

  /**
   * Post a raid recap embed to the guild announcements channel.
   */
  async _postRecap(guildId, raidName, raidDate, attendees, kills, results) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;

      // Find the announcements channel (Annunci-Gilda in Bloods info category)
      await guild.channels.fetch();
      const announceCh = [...guild.channels.cache.values()].find(
        c => c.type === 0 && // GuildText
             (fromFraktur(c.name).toLowerCase().includes('annunci-gilda') ||
              fromFraktur(c.name).toLowerCase().includes('annunci'))
      );
      if (!announceCh) return;

      const { EmbedBuilder } = require('discord.js');

      const attended = attendees.filter(a => a.attended);
      const punctual = attended.filter(a => a.punctual);
      const dateStr = raidDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

      let killSummary = '';
      if (kills.normal > 0) killSummary += `Normal: ${kills.normal} boss\n`;
      if (kills.heroic > 0) killSummary += `Heroic: ${kills.heroic} boss\n`;
      if (kills.mythic > 0) killSummary += `Mythic: ${kills.mythic} boss\n`;
      if (!killSummary) killSummary = 'Wipe night — nessun boss killato\n';

      const embed = new EmbedBuilder()
        .setTitle(`📋 Recap Raid — ${raidName}`)
        .setColor(0x8b0000)
        .setDescription(
          `**Data:** ${dateStr}\n` +
          `**Player presenti:** ${attended.length}\n` +
          `**Puntuali:** ${punctual.length}\n` +
          `**BP totali assegnati:** ${results.bpAwarded >= 0 ? '+' : ''}${results.bpAwarded}\n\n` +
          `**Kill:**\n${killSummary}\n` +
          `**Prossimo raid:** Mercoledì 21:00 (check-in 20:45)`
        )
        .addFields({
          name: 'Presenti',
          value: attended.map(a => `<@${a.userId}>${a.punctual ? ' ⭐' : ''}`).join(', ').substring(0, 1024) || 'Nessuno',
        })
        .setFooter({ text: 'Bloods Hub · Raid Recap · Auto-post' })
        .setTimestamp();

      await announceCh.send({ embeds: [embed] });
      logger.info(`RaidAttendance: posted recap for ${raidName} to #${announceCh.name}`);
    } catch (err) {
      logger.warn(`RaidAttendance: failed to post recap: ${err.message}`);
    }
  }

  /**
   * Auto-detect attendees from voice channel presence.
   * Checks who is in the raid voice channel at the given time.
   *
   * @param {string} guildId
   * @param {string} voiceChannelId - the raid voice channel
   * @param {number} punctualityCutoffMs - ms before raid time to count as punctual (default 15min)
   * @returns {Array<{userId: string, attended: boolean, punctual: boolean}>}
   */
  async detectFromVoiceChannel(guildId, voiceChannelId, punctualityCutoffMs = 15 * 60 * 1000) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return [];

    const channel = guild.channels.cache.get(voiceChannelId);
    if (!channel || !channel.isVoiceBased()) return [];

    const raidTime = new Date();
    const punctualCutoff = new Date(raidTime.getTime() - punctualityCutoffMs);

    const attendees = [];
    for (const member of channel.members.values()) {
      if (member.user.bot) continue;
      attendees.push({
        userId: member.id,
        attended: true,
        punctual: member.joinedAt ? member.joinedAt <= punctualCutoff : false,
      });
    }

    return attendees;
  }

  /**
   * Get attendance history for a user.
   */
  async getUserAttendance(guildId, userId, limit = 20) {
    return await RaidAttendance.findAll({
      where: { guild_id: guildId, user_id: userId },
      order: [['raid_date', 'DESC']],
      limit,
    });
  }

  /**
   * Get attendance stats for a user (last 30 days).
   */
  async getUserStats(guildId, userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const records = await RaidAttendance.findAll({
      where: {
        guild_id: guildId,
        user_id: userId,
        raid_date: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] },
      },
    });

    const total = records.length;
    const attended = records.filter(r => r.attended).length;
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { total, attended, missed: total - attended, attendanceRate };
  }

  async _addBp(guildId, userId, amount) {
    const [bpUser, created] = await BpUser.findOrCreate({
      where: { guild_id: guildId, user_id: userId },
      defaults: { dkp: 0 },
    });
    bpUser.dkp = Math.max(0, bpUser.dkp + amount);
    await bpUser.save();
  }
}

// Export singleton-like instance (initialized in index.js)
let instance = null;

function init(client) {
  instance = new RaidAttendanceService(client);
  return instance;
}

function getInstance() {
  return instance;
}

module.exports = { init, getInstance, RaidAttendanceService, BP_REWARDS };
