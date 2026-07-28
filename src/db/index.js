// src/db/index.js
// Sequelize instance + model registry. Single source of truth for the ORM.
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: config.db.logging ? (msg) => logger.debug(msg) : false,
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    pool: { max: 10, min: 2, idle: 10000 },
  }
);

// Import models
const GuildModel = require('./models/Guild');
const UserModel = require('./models/User');
const GameModel = require('./models/Game');
const UserGameModel = require('./models/UserGame');
const ExternalAccountModel = require('./models/ExternalAccount');
const GameStatModel = require('./models/GameStat');
const ActivityLogModel = require('./models/ActivityLog');
const LeaderboardCacheModel = require('./models/LeaderboardCache');
const GameMetaModel = require('./models/GameMeta');
const AuditLogModel = require('./models/AuditLog');
const UserBadgeModel = require('./models/UserBadge');
const WarningModel = require('./models/Warning');
const CommunityEventModel = require('./models/CommunityEvent');
const EventParticipantModel = require('./models/EventParticipant');
const LevelRewardModel = require('./models/LevelReward');
const AutomodRuleModel = require('./models/AutomodRule');
const DiscordLogModel = require('./models/DiscordLog');
const GuideMessageModel = require('./models/GuideMessage');
const BpUserModel = require('./models/BpUser');
const BpLootHistoryModel = require('./models/BpLootHistory');
const BpActiveRollModel = require('./models/BpActiveRoll');
const BpRaidRosterModel = require('./models/BpRaidRoster');
const BpItemModel = require('./models/BpItem');
const WowEventModel = require('./models/WowEvent');
const WowEventSignupModel = require('./models/WowEventSignup');
const RaidConfigModel = require('./models/RaidConfig');
const RaidEligibilityModel = require('./models/RaidEligibility');
const RaidAttendanceModel = require('./models/RaidAttendance');
const GameModeModel = require('./models/GameMode');
const GiveawayModel = require('./models/Giveaway');
const CustomCommandModel = require('./models/CustomCommand');
const ScheduledMessageModel = require('./models/ScheduledMessage');

// Initialize
const Guild = GuildModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Game = GameModel(sequelize, DataTypes);
const UserGame = UserGameModel(sequelize, DataTypes);
const ExternalAccount = ExternalAccountModel(sequelize, DataTypes);
const GameStat = GameStatModel(sequelize, DataTypes);
const ActivityLog = ActivityLogModel(sequelize, DataTypes);
const LeaderboardCache = LeaderboardCacheModel(sequelize, DataTypes);
const GameMeta = GameMetaModel(sequelize, DataTypes);
const AuditLog = AuditLogModel(sequelize, DataTypes);
const UserBadge = UserBadgeModel(sequelize, DataTypes);
const Warning = WarningModel(sequelize, DataTypes);
const CommunityEvent = CommunityEventModel(sequelize, DataTypes);
const EventParticipant = EventParticipantModel(sequelize, DataTypes);
const LevelReward = LevelRewardModel(sequelize, DataTypes);
const AutomodRule = AutomodRuleModel(sequelize, DataTypes);
const DiscordLog = DiscordLogModel(sequelize, DataTypes);
const GuideMessage = GuideMessageModel(sequelize, DataTypes);
const BpUser = BpUserModel(sequelize, DataTypes);
const BpLootHistory = BpLootHistoryModel(sequelize, DataTypes);
const BpActiveRoll = BpActiveRollModel(sequelize, DataTypes);
const BpRaidRoster = BpRaidRosterModel(sequelize, DataTypes);
const BpItem = BpItemModel(sequelize, DataTypes);
const WowEvent = WowEventModel(sequelize, DataTypes);
const WowEventSignup = WowEventSignupModel(sequelize, DataTypes);
const RaidConfig = RaidConfigModel(sequelize, DataTypes);
const RaidEligibility = RaidEligibilityModel(sequelize, DataTypes);
const RaidAttendance = RaidAttendanceModel(sequelize, DataTypes);
const GameMode = GameModeModel(sequelize);
const Giveaway = GiveawayModel(sequelize);
const CustomCommand = CustomCommandModel(sequelize);
const ScheduledMessage = ScheduledMessageModel(sequelize);

// Associations
Guild.hasMany(User, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
User.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Game.hasMany(UserGame, { foreignKey: 'game_id' });
UserGame.belongsTo(Game, { foreignKey: 'game_id' });
User.hasMany(UserGame, { foreignKey: 'user_id', sourceKey: 'user_id' });
UserGame.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.hasMany(ExternalAccount, { foreignKey: 'user_id', sourceKey: 'user_id' });
ExternalAccount.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

Game.hasMany(GameStat, { foreignKey: 'game_id' });
GameStat.belongsTo(Game, { foreignKey: 'game_id' });
User.hasMany(GameStat, { foreignKey: 'user_id', sourceKey: 'user_id' });
GameStat.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

Game.hasMany(GameMeta, { foreignKey: 'game_id' });
GameMeta.belongsTo(Game, { foreignKey: 'game_id' });

Guild.hasMany(LeaderboardCache, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Game.hasMany(LeaderboardCache, { foreignKey: 'game_id' });

Guild.hasMany(AuditLog, { foreignKey: 'guild_id', sourceKey: 'guild_id' });

User.hasMany(UserBadge, { foreignKey: 'user_id', sourceKey: 'user_id' });
UserBadge.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

User.hasMany(Warning, { foreignKey: 'user_id', sourceKey: 'user_id' });
Warning.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

CommunityEvent.hasMany(EventParticipant, { foreignKey: 'event_id' });
EventParticipant.belongsTo(CommunityEvent, { foreignKey: 'event_id' });
CommunityEvent.belongsTo(Game, { foreignKey: 'game_id' });

Guild.hasMany(LevelReward, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
LevelReward.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(AutomodRule, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
AutomodRule.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(DiscordLog, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
DiscordLog.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// BP / DKP associations
Guild.hasMany(BpUser, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpUser.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(BpLootHistory, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpLootHistory.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// WoW events associations
WowEvent.hasMany(WowEventSignup, { foreignKey: 'event_id' });
WowEventSignup.belongsTo(WowEvent, { foreignKey: 'event_id' });

// Raid eligibility associations
Guild.hasOne(RaidConfig, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
RaidConfig.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(RaidEligibility, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
RaidEligibility.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(RaidAttendance, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
RaidAttendance.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// GameMode (private servers) associations
Guild.hasMany(GameMode, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
GameMode.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Giveaway associations
Guild.hasMany(Giveaway, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Giveaway.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// CustomCommand associations
Guild.hasMany(CustomCommand, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
CustomCommand.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// ScheduledMessage associations
Guild.hasMany(ScheduledMessage, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
ScheduledMessage.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

async function connectDB() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established.');
    // Sync only creates missing tables — never drops. For production use migrations.
    await sequelize.sync({ alter: false });
    logger.info('Database schema synced.');
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
    throw err;
  }
}

module.exports = {
  sequelize,
  connectDB,
  Guild,
  User,
  Game,
  UserGame,
  ExternalAccount,
  GameStat,
  ActivityLog,
  LeaderboardCache,
  GameMeta,
  AuditLog,
  UserBadge,
  Warning,
  CommunityEvent,
  EventParticipant,
  LevelReward,
  AutomodRule,
  DiscordLog,
  GuideMessage,
  BpUser,
  BpLootHistory,
  BpActiveRoll,
  BpRaidRoster,
  BpItem,
  WowEvent,
  WowEventSignup,
  RaidConfig,
  RaidEligibility,
  RaidAttendance,
  GameMode,
  Giveaway,
  CustomCommand,
  ScheduledMessage,
};
