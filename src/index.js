// src/index.js
// Bloods Hub Bot — entry point.
// Initializes DB, loads commands & events, logs in to Discord, starts cron jobs.
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDB, sequelize } = require('./db');

const CommandHandler = require('./handlers/commandHandler');
const EventHandler = require('./handlers/eventHandler');
const ActivityTracker = require('./services/activityTracker');
const LeaderboardScheduler = require('./services/leaderboardScheduler');
const MetaScheduler = require('./services/metaScheduler');
const NewsPoster = require('./services/newsPoster');
const GuidePoster = require('./services/guidePoster');
const CleanupScheduler = require('./services/cleanupScheduler');
const BackupScheduler = require('./services/backupScheduler');
const StatRefreshScheduler = require('./services/statRefreshScheduler');
const RaidScheduler = require('./services/raidScheduler');
const WarcraftLogsService = require('./services/warcraftLogsService');
const AffixScheduler = require('./services/affixScheduler');
const WeeklyKeysPoster = require('./services/weeklyKeysPoster');
const PatchAlertService = require('./services/patchAlertService');
const AttendanceFlagService = require('./services/attendanceFlagService');
const { init: initRaidAttendance } = require('./services/raidAttendanceService');
const OnboardingService = require('./services/onboardingService');
const TicketService = require('./services/ticketService');
const _AdvancedLogger = require('./services/advancedLogger');
const AdminPanelService = require('./services/adminPanelService');
const RulesPanelService = require('./services/rulesPanelService');
const GameModeService = require('./services/gameModeService');
const MemberCounterService = require('./services/memberCounterService');
const GiveawayService = require('./services/giveawayService');
const ScheduledMessageService = require('./services/scheduledMessageService');
const AlertService = require('./services/alertService');
const AutomodService = require('./services/automodService');
const AntiRaidService = require('./services/antiRaidService');
const WelcomeService = require('./services/welcomeService');
const BadgeService = require('./services/badgeService');
const ReminderService = require('./services/reminderService');
const BirthdayService = require('./services/birthdayService');
const ReactionRoleService = require('./services/reactionRoleService');
const MilestoneService = require('./services/milestoneService');
const WeeklyStatsService = require('./services/weeklyStatsService');
const GuildChallengeService = require('./services/guildChallengeService');
const StarboardService = require('./services/starboardService');
const XpEventService = require('./services/xpEventService');
const LfgService = require('./services/lfgService');
const ChallengeService = require('./services/challengeService');
const _ReputationService = require('./services/reputationService');
const GameNightService = require('./services/gameNightService');
const MusicService = require('./services/musicService');
const FeedbackService = require('./services/feedbackService');
const DynamicStatusService = require('./services/dynamicStatusService');
const RaidSummaryService = require('./services/raidSummaryService');
const TwitchAlertService = require('./services/twitchAlertService');
const YouTubeService = require('./services/youtubeService');
const TikTokService = require('./services/tiktokService');
const SocialGrowthService = require('./services/socialGrowthService');
const HealthServer = require('./server/healthServer');
const DashboardServer = require('./server/dashboardServer');

async function main() {
  // 1. Database
  await connectDB();

  // 2. Client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction, Partials.User],
  });

  // 3. Commands
  const commandHandler = new CommandHandler(require('path').join(__dirname, 'commands'));
  commandHandler.load();
  client.commands = new Collection();
  for (const cmd of commandHandler.all()) client.commands.set(cmd.data.name, cmd);
  client.commandHandler = commandHandler;

  // 4. Events
  const eventHandler = new EventHandler(require('path').join(__dirname, 'events'), client);
  eventHandler.load();

  // 5. Background services
  client.activityTracker = new ActivityTracker(client);
  client.activityTracker.start();

  client.leaderboardScheduler = new LeaderboardScheduler(client);
  client.leaderboardScheduler.start();

  client.metaScheduler = new MetaScheduler(client);
  client.metaScheduler.start();

  client.newsPoster = new NewsPoster(client);
  client.newsPoster.start();

  client.guidePoster = new GuidePoster(client);
  client.guidePoster.start();

  client.cleanupScheduler = new CleanupScheduler(client);
  client.cleanupScheduler.start();

  BackupScheduler.start();

  client.statRefreshScheduler = new StatRefreshScheduler(client);
  client.statRefreshScheduler.start();

  client.raidScheduler = new RaidScheduler(client);
  client.raidScheduler.start();

  const RaidBookingScheduler = require('./services/raidBookingScheduler');
  RaidBookingScheduler.start(client);

  // Warcraft Logs auto-post (new reports to #raid-log)
  client.warcraftLogsService = new WarcraftLogsService(client);
  client.warcraftLogsService.start();

  // Affix M+ auto-post (every Tuesday 10:05 AM to #keys-settimanali)
  client.affixScheduler = new AffixScheduler(client);
  client.affixScheduler.start();

  // Raid attendance service (BP from attendance)
  client.raidAttendanceService = initRaidAttendance(client);

  // Weekly M+ keys recap (Monday 20:00)
  client.weeklyKeysPoster = new WeeklyKeysPoster(client);
  client.weeklyKeysPoster.start();

  // Patch day alert (checks every 6h for new WoW patch)
  client.patchAlertService = new PatchAlertService(client);
  client.patchAlertService.start();

  // Attendance flagging (Monday 09:00 — flags raiders <50% attendance)
  client.attendanceFlagService = new AttendanceFlagService(client);
  client.attendanceFlagService.start();

  // Member counter (voice channel live update)
  MemberCounterService.start(client);

  // Giveaway scheduler (auto-end expired giveaways)
  GiveawayService.start(client);

  // Scheduled messages (cron-based)
  await ScheduledMessageService.start(client);

  // Alert monitoring (memory, errors, crashes)
  AlertService.init(client);

  // Milestone announcements (member count)
  MilestoneService.start(client);

  // Weekly stats (auto-post every Sunday at 6 PM)
  WeeklyStatsService.start(client);

  // Guild challenges (community-wide goals)
  GuildChallengeService.start(client);

  // Stateless services (initialized for reference, used by event handlers)
  client.automodService = AutomodService;
  client.antiRaidService = AntiRaidService;
  client.welcomeService = WelcomeService;
  client.badgeService = BadgeService;
  client.reactionRoleService = ReactionRoleService;
  client.starboardService = StarboardService;

  // Reminder scheduler (checks every 30s)
  ReminderService.start(client);

  // Birthday cron (daily at 9:00 AM)
  BirthdayService.start(client);

  // XP event — load from DB on startup
  XpEventService.loadFromDB(config.discord.guildId || '1010226759817515018').catch(() => {});

  // LFG session expiry scheduler (every 5 min)
  setInterval(() => LfgService.expireOldSessions().catch(() => {}), 300000);

  // Challenge expiry scheduler (every hour)
  setInterval(() => ChallengeService.expireOldChallenges().catch(() => {}), 3600000);

  // Game night scheduler (every 10 min check)
  GameNightService.start(client);

  // Feedback watcher — checks pending-fixes.json for completed fixes (every 30s)
  FeedbackService.startWatcher(client);

  // Dynamic bot status (rotates every 60s with member count, raid status, etc.)
  DynamicStatusService.start(client);

  // Raid summary auto-post (daily at 23:59, only if raid happened)
  RaidSummaryService.start(client);

  // Twitch stream alerts (checks every 2min for members streaming)
  TwitchAlertService.start(client);

  // YouTube auto-post new videos + channel stats
  YouTubeService.start(client);

  // TikTok auto-post new videos
  TikTokService.start(client);

  // Social growth tracker (daily stats, weekly reports, content ideas, SEO audit)
  SocialGrowthService.start(client);

  // Onboarding + ticket panels (post after ready)
  client.on('clientReady', async () => {
    try {
      const guild = client.guilds.cache.get(config.discord.guildId || '1010226759817515018');
      if (guild) {
        await OnboardingService.setupNonVerificatoRole(guild);
        await OnboardingService.postVerificationGate(client);
        await TicketService.postTicketPanel(client);
        await AdminPanelService.postPanels(client);
        await RulesPanelService.postRulesPanel(client);
        await GameModeService.postGameModePanel(client);
        const WowProfessionPanel = require('./ui/wowProfessionPanel');
        await WowProfessionPanel.postProfessionPanel(client);
        // Info panels for new channels (Tattiche, Banca, Presentazioni, FAQ, LFG, Eventi)
        const { postAllPanels: postChannelInfoPanels } = require('./services/channelInfoPanels');
        await postChannelInfoPanels(client);
        logger.info('Onboarding + ticket + admin + rules + gamemode + wowprof + channel-info panels posted.');
      }
    } catch (e) {
      logger.warn(`Onboarding setup failed: ${e.message}`);
    }
    // Set changelog client for posting updates
    const { setClient: setChangelogClient } = require('./utils/changelog');
    setChangelogClient(client);
  });

  // Health check HTTP server.
  client.healthServer = new HealthServer(client);
  client.healthServer.start();

  // Dashboard server (Express + API + static frontend).
  client.dashboardServer = new DashboardServer(client);
  client.dashboardServer.start();

  // 6. Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    try {
      // Stop all background services
      client.activityTracker?.stop();
      client.leaderboardScheduler?.stop();
      client.metaScheduler?.stop();
      client.newsPoster?.stop();
      client.guidePoster?.stop();
      client.cleanupScheduler?.stop();
      BackupScheduler.stop();
      client.statRefreshScheduler?.stop();
      client.raidScheduler?.stop();
      client.warcraftLogsService?.stop();
      client.affixScheduler?.stop();
      client.weeklyKeysPoster?.stop();
      client.patchAlertService?.stop();
      client.attendanceFlagService?.stop();
      MemberCounterService?.stop();
      GiveawayService?.stop();
      ScheduledMessageService?.stop();
      AlertService?.stop();
      ReminderService?.stop();
      BirthdayService?.stop();
      MilestoneService.stop();
      WeeklyStatsService.stop();
      GuildChallengeService.stop();
      GameNightService.stop();
      MusicService.stopAll();
      FeedbackService.stopWatcher();
      DynamicStatusService.stop();
      RaidSummaryService.stop();
      TwitchAlertService.stop();
      YouTubeService.stop();
      TikTokService.stop();
      SocialGrowthService.stop();
      // Stop interval-based services without explicit stop in shutdown
      try { require('./services/xpService').stop(); } catch {}
      try { require('./services/captchaService').stop(); } catch {}
      try { require('./services/reputationService').stop(); } catch {}
      try { require('./services/automodService').stop(); } catch {}
      client.healthServer?.stop();
      client.dashboardServer?.stop();
      client.destroy();
      await sequelize.close();
      logger.info('Shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
  process.on('uncaughtException', (err) => logger.error('Uncaught exception:', err));

  // 7. Login
  await client.login(config.discord.token);
  logger.info(`Logged in as ${client.user?.tag}`);

  // 8. Reconnect handling & connection alerts
  client.on('disconnect', () => {
    logger.warn('WebSocket disconnected. discord.js will auto-reconnect.');
  });
  client.on('reconnecting', () => {
    logger.info('WebSocket reconnecting...');
  });
  client.on('resume', () => {
    logger.info('WebSocket resumed. Connection restored.');
  });
  client.on('error', (err) => {
    logger.error(`Client error: ${err.message}`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
