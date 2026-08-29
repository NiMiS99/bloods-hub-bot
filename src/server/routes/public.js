// src/server/routes/public.js
// Public (unauthenticated) read-only endpoints for the guild website.
// All responses are cached in-memory for 60s to protect the database.
const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../../db');
const {
  User, Game, CommunityEvent, EventParticipant,
  RaidConfig, RaidEligibility, RaidAttendance,
  BpUser, BpLootHistory, BpActiveRoll,
  Giveaway, Tournament, TournamentParticipant,
} = require('../../db');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function cached(key, producer) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  return Promise.resolve()
    .then(producer)
    .then((data) => {
      cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
      return data;
    });
}

function resolveGuild(client) {
  const envId = process.env.GUILD_ID;
  if (envId && client.guilds.cache.has(envId)) return client.guilds.cache.get(envId);
  return client.guilds.cache.first() || null;
}

module.exports = function (client) {
  const router = express.Router();

  // GET /api/public/info — public guild overview + community stats
  router.get('/info', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`info:${guild.id}`, async () => {
        const [totalUsers, totalMessages, totalVoice, games, events] = await Promise.all([
          User.count({ where: { guild_id: guild.id } }),
          User.sum('total_messages', { where: { guild_id: guild.id } }),
          User.sum('total_voice_seconds', { where: { guild_id: guild.id } }),
          Game.count({ where: { is_active: true } }),
          CommunityEvent.count({ where: { guild_id: guild.id, is_active: true } }),
        ]);
        return {
          name: guild.name,
          icon: guild.iconURL({ size: 256 }),
          memberCount: guild.memberCount,
          stats: {
            totalUsers,
            totalMessages: totalMessages || 0,
            totalVoiceHours: Math.round((totalVoice || 0) / 3600),
            games,
            events,
          },
        };
      });

      res.json(data);
    } catch {
      res.status(500).json({ error: 'Errore recupero informazioni pubbliche' });
    }
  });

  // GET /api/public/leaderboard?metric=xp|messages|voice — top 10, sanitized
  router.get('/leaderboard', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const metricMap = { xp: 'xp', messages: 'total_messages', voice: 'total_voice_seconds' };
      const metric = metricMap[req.query.metric] || 'xp';

      const data = await cached(`lb:${guild.id}:${metric}`, async () => {
        const users = await User.findAll({
          where: { guild_id: guild.id },
          order: [[metric, 'DESC']],
          limit: 10,
          raw: true,
        });
        return users.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          level: u.level,
          value: u[metric],
        }));
      });

      res.json({ metric: req.query.metric || 'xp', entries: data });
    } catch {
      res.status(500).json({ error: 'Errore recupero classifica' });
    }
  });

  // GET /api/public/events — upcoming active community events
  router.get('/events', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`events:${guild.id}`, async () => {
        const events = await CommunityEvent.findAll({
          where: {
            guild_id: guild.id,
            is_active: true,
            scheduled_at: { [Op.gte]: new Date(Date.now() - 24 * 3600 * 1000) },
          },
          order: [['scheduled_at', 'ASC']],
          limit: 12,
        });
        return Promise.all(
          events.map(async (e) => {
            const count = await EventParticipant.count({ where: { event_id: e.id } });
            const game = e.game_id ? await Game.findByPk(e.game_id) : null;
            return {
              id: e.id,
              name: e.name,
              description: e.description,
              scheduledAt: e.scheduled_at,
              durationMinutes: e.duration_minutes,
              game: game ? { name: game.name, code: game.code } : null,
              participantCount: count,
            };
          })
        );
      });

      res.json({ events: data });
    } catch {
      res.status(500).json({ error: 'Errore recupero eventi' });
    }
  });

  // GET /api/public/raid — raid schedule, requirements, eligible count
  router.get('/raid', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`raid:${guild.id}`, async () => {
        let config;
        try {
          config = await RaidConfig.findOne({ where: { guild_id: guild.id }, raw: true });
        } catch {
          config = null;
        }
        if (!config) return { configured: false };

        // Parse raid_days manually (raw: true skips Sequelize getters)
        let raidDaysRaw = config.raid_days;
        if (typeof raidDaysRaw === 'string') {
          try { raidDaysRaw = JSON.parse(raidDaysRaw); } catch { raidDaysRaw = []; }
        }
        if (!Array.isArray(raidDaysRaw)) raidDaysRaw = [];

        const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const raidDays = raidDaysRaw.map((d) => dayNames[d] || `Giorno ${d}`);

        let eligibleCount = 0;
        let totalChecked = 0;
        let uniqueRaidSessions = 0;
        let raidNames = [];
        let roster = [];

        try {
          eligibleCount = await RaidEligibility.count({
            where: { guild_id: guild.id, is_eligible: true },
          });
          totalChecked = await RaidEligibility.count({
            where: { guild_id: guild.id },
          });
        } catch { /* tables might not exist yet */ }

        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
          const recentRaids = await RaidAttendance.findAll({
            where: {
              guild_id: guild.id,
              raid_date: { [Op.gte]: thirtyDaysAgo },
              attended: true,
            },
            attributes: ['raid_name', 'raid_date'],
            group: ['raid_name', 'raid_date'],
            raw: true,
          });
          uniqueRaidSessions = recentRaids.length;
          raidNames = [...new Set(recentRaids.map((r) => r.raid_name))];
        } catch { /* table might not exist */ }

        try {
          const eligibilitySnapshots = await RaidEligibility.findAll({
            where: { guild_id: guild.id },
            attributes: ['ilvl_avg', 'is_eligible', 'character_class', 'character_name'],
            raw: true,
          });
          roster = eligibilitySnapshots
            .filter((e) => e.character_name)
            .map((e) => ({
              character: e.character_name,
              class: e.character_class,
              ilvl: e.ilvl_avg,
              eligible: !!e.is_eligible,
            }))
            .sort((a, b) => (b.ilvl || 0) - (a.ilvl || 0))
            .slice(0, 30);
        } catch { /* table might not exist */ }

        return {
          configured: true,
          raidName: config.raid_name,
          raidDays,
          raidTime: config.raid_time,
          requirements: {
            minIlvl: config.min_ilvl,
            minAttendance: config.min_raid_attendance,
            requireTierBonus: !!config.require_tier_bonus,
            requireAchievement: config.require_achievement,
          },
          stats: {
            eligibleCount,
            totalChecked,
            uniqueRaidSessions,
            raidNames,
          },
          roster,
        };
      });

      res.json(data);
    } catch (err) {
      console.error('[public/raid] error:', err.message);
      res.status(500).json({ error: 'Errore recupero info raid' });
    }
  });

  // GET /api/public/bp/leaderboard — top 10 BP holders
  router.get('/bp/leaderboard', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`bp_lb:${guild.id}`, async () => {
        const rows = await BpUser.findAll({
          where: { guild_id: guild.id, dkp: { [Op.gt]: 0 } },
          order: [['dkp', 'DESC']],
          limit: 10,
          raw: true,
        });
        return rows.map((r, i) => ({
          rank: i + 1,
          userId: r.user_id,
          dkp: r.dkp,
        }));
      });

      // Resolve usernames from Discord
      const entries = await Promise.all(
        data.map(async (e) => {
          try {
            const member = await guild.members.fetch(e.userId);
            return { ...e, username: member.displayName || member.user.username };
          } catch {
            return { ...e, username: 'Sconosciuto' };
          }
        })
      );

      res.json({ entries });
    } catch {
      res.status(500).json({ error: 'Errore recupero classifica BP' });
    }
  });

  // GET /api/public/bp/loot — recent loot history (public, no bid info)
  router.get('/bp/loot', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`bp_loot:${guild.id}`, async () => {
        const rows = await BpLootHistory.findAll({
          where: { guild_id: guild.id },
          order: [['closed_at', 'DESC']],
          limit: 15,
          raw: true,
        });
        return rows.map((r) => ({
          id: r.id,
          itemName: r.item_name,
          boss: r.boss,
          winnerId: r.winner_id,
          participants: r.participants,
          closedAt: r.closed_at,
        }));
      });

      // Resolve winner names
      const entries = await Promise.all(
        data.map(async (e) => {
          try {
            const member = await guild.members.fetch(e.winnerId);
            return { ...e, winnerName: member.displayName || member.user.username };
          } catch {
            return { ...e, winnerName: 'Sconosciuto' };
          }
        })
      );

      res.json({ entries });
    } catch {
      res.status(500).json({ error: 'Errore recupero loot history' });
    }
  });

  // GET /api/public/giveaways — active giveaways
  router.get('/giveaways', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`giveaways:${guild.id}`, async () => {
        const giveaways = await Giveaway.findAll({
          where: {
            guild_id: guild.id,
            is_active: true,
            is_ended: false,
            ends_at: { [Op.gt]: new Date() },
          },
          order: [['ends_at', 'ASC']],
          limit: 5,
          raw: true,
        });
        return giveaways.map((g) => ({
          id: g.id,
          title: g.title,
          prize: g.prize,
          winnerCount: g.winner_count,
          endsAt: g.ends_at,
        }));
      });

      res.json({ giveaways: data });
    } catch {
      res.status(500).json({ error: 'Errore recupero giveaway' });
    }
  });

  // GET /api/public/tournaments — active tournaments
  router.get('/tournaments', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.status(503).json({ error: 'Guild non disponibile' });

      const data = await cached(`tournaments:${guild.id}`, async () => {
        const tournaments = await Tournament.findAll({
          where: {
            guild_id: guild.id,
            status: ['registration', 'in_progress'],
          },
          order: [['created_at', 'DESC']],
          limit: 5,
          raw: true,
        });
        return Promise.all(
          tournaments.map(async (t) => {
            const participantCount = await TournamentParticipant.count({
              where: { tournament_id: t.id },
            });
            return {
              id: t.id,
              name: t.name,
              game: t.game,
              format: t.format,
              status: t.status,
              maxParticipants: t.max_participants,
              participantCount,
              startedAt: t.started_at,
            };
          })
        );
      });

      res.json({ tournaments: data });
    } catch {
      res.status(500).json({ error: 'Errore recupero tornei' });
    }
  });

  // GET /api/public/raid/progress — raid progression (boss kill tracker)
  router.get('/raid/progress', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.json({ progression: [], raidName: null });

      const config = await RaidConfig.findOne({
        where: { guild_id: guild.id },
        raw: true,
      });

      if (!config) return res.json({ progression: [], raidName: null });

      // Get recent loot history grouped by boss to infer kills
      const recentLoot = await BpLootHistory.findAll({
        where: { guild_id: guild.id },
        attributes: [
          'boss',
          [sequelize.fn('COUNT', sequelize.col('id')), 'lootCount'],
          [sequelize.fn('MAX', sequelize.col('closed_at')), 'lastKill'],
        ],
        where: { guild_id: guild.id, boss: { [Op.ne]: null } },
        group: ['boss'],
        order: [[sequelize.fn('MAX', sequelize.col('closed_at')), 'DESC']],
        raw: true,
      });

      // Get unique raid sessions from attendance
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      const raidSessions = await RaidAttendance.findAll({
        attributes: [
          'raid_name',
          [sequelize.fn('COUNT', sequelize.col('id')), 'sessionCount'],
        ],
        where: {
          guild_id: guild.id,
          raid_date: { [Op.gte]: thirtyDaysAgo },
        },
        group: ['raid_name'],
        raw: true,
      });

      const progression = recentLoot.map((l) => ({
        boss: l.boss,
        lootCount: l.lootCount,
        lastKill: l.lastKill,
        defeated: true,
      }));

      res.json({
        raidName: config.raid_name,
        progression,
        raidSessions: raidSessions.map((r) => ({
          name: r.raid_name,
          count: r.sessionCount,
        })),
      });
    } catch (err) {
      console.error('[public] raid/progress error:', err);
      res.json({ progression: [], raidName: null, raidSessions: [] });
    }
  });

  // GET /api/public/hall-of-fame — top members by BP, attendance, loot
  router.get('/hall-of-fame', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.json({ topBp: [], topAttendance: [], topLooters: [] });

      // Top BP holders
      const topBp = await BpUser.findAll({
        where: { guild_id: guild.id },
        order: [['dkp', 'DESC']],
        limit: 10,
        raw: true,
      });

      // Top attendance (last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
      const attendanceStats = await RaidAttendance.findAll({
        attributes: [
          'user_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'attendedCount'],
        ],
        where: {
          guild_id: guild.id,
          attended: true,
          raid_date: { [Op.gte]: ninetyDaysAgo },
        },
        group: ['user_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true,
      });

      // Top loot winners
      const topLooters = await BpLootHistory.findAll({
        attributes: [
          'winner_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'lootWon'],
          [sequelize.fn('SUM', sequelize.col('bid')), 'totalBid'],
        ],
        where: { guild_id: guild.id },
        group: ['winner_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true,
      });

      // Resolve usernames
      const allUserIds = [
        ...topBp.map((b) => b.user_id),
        ...attendanceStats.map((a) => a.user_id),
        ...topLooters.map((l) => l.winner_id),
      ].filter(Boolean);
      const uniqueIds = [...new Set(allUserIds)];
      const users = await User.findAll({
        where: { user_id: uniqueIds },
        attributes: ['user_id', 'username', 'avatar_url'],
        raw: true,
      });
      const userMap = {};
      users.forEach((u) => { userMap[u.user_id] = u; });

      res.json({
        topBp: topBp.map((b) => ({
          userId: b.user_id,
          username: userMap[b.user_id]?.username || 'Sconosciuto',
          avatar: userMap[b.user_id]?.avatar_url,
          bp: b.dkp,
        })),
        topAttendance: attendanceStats.map((a) => ({
          userId: a.user_id,
          username: userMap[a.user_id]?.username || 'Sconosciuto',
          avatar: userMap[a.user_id]?.avatar_url,
          attendedCount: a.attendedCount,
        })),
        topLooters: topLooters.map((l) => ({
          userId: l.winner_id,
          username: userMap[l.winner_id]?.username || 'Sconosciuto',
          avatar: userMap[l.winner_id]?.avatar_url,
          lootWon: l.lootWon,
          totalBid: l.totalBid,
        })),
      });
    } catch (err) {
      console.error('[public] hall-of-fame error:', err);
      res.json({ topBp: [], topAttendance: [], topLooters: [] });
    }
  });

  // GET /api/public/bp/loot/full — full loot gallery with filters
  router.get('/bp/loot/full', async (req, res) => {
    try {
      const guild = resolveGuild(client);
      if (!guild) return res.json({ entries: [], total: 0, bosses: [] });

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const offset = parseInt(req.query.offset) || 0;
      const bossFilter = req.query.boss;
      const where = { guild_id: guild.id };
      if (bossFilter) where.boss = bossFilter;

      const { count, rows } = await BpLootHistory.findAndCountAll({
        where,
        order: [['closed_at', 'DESC']],
        limit,
        offset,
        raw: true,
      });

      // Resolve winner names
      const winnerIds = [...new Set(rows.map((r) => r.winner_id).filter(Boolean))];
      const users = await User.findAll({
        where: { user_id: winnerIds },
        attributes: ['user_id', 'username'],
        raw: true,
      });
      const userMap = {};
      users.forEach((u) => { userMap[u.user_id] = u.username; });

      // Get unique bosses for filter
      const bosses = await BpLootHistory.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('boss')), 'boss']],
        where: { guild_id: guild.id, boss: { [Op.ne]: null } },
        raw: true,
      });

      res.json({
        entries: rows.map((r) => ({
          id: r.id,
          itemName: r.item_name,
          boss: r.boss,
          raidName: r.raid_name,
          winnerName: userMap[r.winner_id] || 'Sconosciuto',
          bid: r.bid,
          roll: r.roll,
          score: r.score,
          participants: r.participants,
          closedAt: r.closed_at,
        })),
        total: count,
        bosses: bosses.map((b) => b.boss).filter(Boolean),
      });
    } catch (err) {
      console.error('[public] bp/loot/full error:', err);
      res.json({ entries: [], total: 0, bosses: [] });
    }
  });

  // GET /api/public/discord-widget — live Discord presence
  router.get('/discord-widget', async (req, res) => {
    try {
      const discordGuild = resolveGuild(client);
      if (!discordGuild) return res.json({ online: 0, members: [], voiceChannels: [] });

      await discordGuild.members.fetch({ withPresences: true });

      const onlineMembers = discordGuild.members.cache
        .filter((m) => m.presence && m.presence.status !== 'offline' && !m.user.bot)
        .map((m) => ({
          username: m.user.username,
          avatar: m.user.displayAvatarURL({ size: 64, extension: 'png' }),
          status: m.presence.status,
          activity: m.presence.activities?.[0]?.name || null,
        }))
        .slice(0, 50);

      const voiceChannels = discordGuild.channels.cache
        .filter((c) => c.type === 2 && c.members.size > 0)
        .map((c) => ({
          name: c.name,
          memberCount: c.members.size,
          members: c.members.map((m) => ({
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ size: 32, extension: 'png' }),
          })),
        }))
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 10);

      res.json({
        online: onlineMembers.length,
        totalMembers: discordGuild.memberCount,
        members: onlineMembers,
        voiceChannels,
      });
    } catch (err) {
      console.error('[public] discord-widget error:', err);
      res.json({ online: 0, members: [], voiceChannels: [] });
    }
  });

  // GET /api/public/youtube — latest videos + channel stats
  router.get('/youtube', async (req, res) => {
    try {
      const youtubeService = require('../../services/youtubeService');
      const maxResults = Math.min(parseInt(req.query.limit) || 6, 12);

      const [stats, videos] = await Promise.all([
        youtubeService.fetchChannelStats(),
        (async () => {
          if (!youtubeService.isEnabled()) return [];
          const axios = require('axios');
          const API_BASE = 'https://www.googleapis.com/youtube/v3';
          const apiKey = process.env.YOUTUBE_API_KEY;
          const channelId = process.env.YOUTUBE_CHANNEL_ID;
          try {
            const chRes = await axios.get(`${API_BASE}/channels`, {
              params: { part: 'contentDetails', id: channelId, key: apiKey },
              timeout: 10000,
            });
            const uploadsId = chRes.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
            if (!uploadsId) return [];
            const plRes = await axios.get(`${API_BASE}/playlistItems`, {
              params: { part: 'snippet', playlistId: uploadsId, maxResults, key: apiKey },
              timeout: 10000,
            });
            return (plRes.data?.items || []).map((item) => {
              const sn = item.snippet;
              return {
                videoId: sn.resourceId?.videoId,
                title: sn.title,
                description: (sn.description || '').slice(0, 200),
                thumbnail: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url,
                publishedAt: sn.publishedAt,
                channelTitle: sn.channelTitle,
              };
            });
          } catch { return []; }
        })(),
      ]);

      res.json({
        channel: stats ? {
          title: stats.title,
          subscriberCount: stats.subscriberCount,
          viewCount: stats.viewCount,
          videoCount: stats.videoCount,
        } : null,
        videos,
      });
    } catch (err) {
      console.error('[public] youtube error:', err);
      res.json({ channel: null, videos: [] });
    }
  });

  // GET /api/public/docs — API documentation
  router.get('/docs', (req, res) => {
    res.json({
      name: 'Bloods Hub Bot — Public API',
      baseUrl: 'https://bloodswow.it/api/public',
      version: '1.0.0',
      endpoints: [
        { method: 'GET', path: '/info', description: 'Info gilda + statistiche community' },
        { method: 'GET', path: '/leaderboard?metric=xp|messages|voice', description: 'Classifica membri per metrica' },
        { method: 'GET', path: '/bp/leaderboard', description: 'Classifica BP/DKP' },
        { method: 'GET', path: '/bp/loot', description: 'Ultimi loot BP' },
        { method: 'GET', path: '/bp/loot/full?limit=50&boss=', description: 'Galleria loot completa con filtri' },
        { method: 'GET', path: '/raid', description: 'Configurazione raid + roster + requisiti' },
        { method: 'GET', path: '/raid/progress', description: 'Progressione boss kill' },
        { method: 'GET', path: '/hall-of-fame', description: 'Top BP, attendance, looter' },
        { method: 'GET', path: '/events', description: 'Eventi community attivi' },
        { method: 'GET', path: '/giveaways', description: 'Giveaway attivi' },
        { method: 'GET', path: '/tournaments', description: 'Tornei attivi' },
        { method: 'GET', path: '/discord-widget', description: 'Membri online + canali vocali live' },
        { method: 'GET', path: '/youtube?limit=6', description: 'Ultimi video YouTube + statistiche canale' },
        { method: 'GET', path: '/docs', description: 'Questa documentazione' },
      ],
      rateLimit: '100 req / 15 min per IP',
      auth: 'Endpoint privati richiedono cookie JWT (login Discord OAuth2)',
    });
  });

  return router;
};
