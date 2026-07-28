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
const StatRefreshScheduler = require('./services/statRefreshScheduler');
const RaidScheduler = require('./services/raidScheduler');
const OnboardingService = require('./services/onboardingService');
const TicketService = require('./services/ticketService');
const AdvancedLogger = require('./services/advancedLogger');
const AdminPanelService = require('./services/adminPanelService');
const RulesPanelService = require('./services/rulesPanelService');
const GameModeService = require('./services/gameModeService');
const MemberCounterService = require('./services/memberCounterService');
const GiveawayService = require('./services/giveawayService');
const ScheduledMessageService = require('./services/scheduledMessageService');
const AlertService = require('./services/alertService');
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
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
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

  client.statRefreshScheduler = new StatRefreshScheduler(client);
  client.statRefreshScheduler.start();

  client.raidScheduler = new RaidScheduler(client);
  client.raidScheduler.start();

  // Member counter (voice channel live update)
  MemberCounterService.start(client);

  // Giveaway scheduler (auto-end expired giveaways)
  GiveawayService.start(client);

  // Scheduled messages (cron-based)
  await ScheduledMessageService.start(client);

  // Alert monitoring (memory, errors, crashes)
  AlertService.init(client);

  // Onboarding + ticket panels (post after ready)
  client.on('clientReady', async () => {
    try {
      const guild = client.guilds.cache.get('1010226759817515018');
      if (guild) {
        await OnboardingService.setupNonVerificatoRole(guild);
        await OnboardingService.postVerificationGate(client);
        await TicketService.postTicketPanel(client);
        await AdminPanelService.postPanels(client);
        await RulesPanelService.postRulesPanel(client);
        await GameModeService.postGameModePanel(client);
        logger.info('Onboarding + ticket + admin + rules + gamemode panels posted.');
      }
    } catch (e) {
      logger.warn(`Onboarding setup failed: ${e.message}`);
    }
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
      client.statRefreshScheduler?.stop();
      client.raidScheduler?.stop();
      MemberCounterService?.stop();
      GiveawayService?.stop();
      ScheduledMessageService?.stop();
      AlertService?.stop();
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
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
