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
const ReactionRoleModel = require('./models/ReactionRole');
const ReminderModel = require('./models/Reminder');
const StarboardModel = require('./models/Starboard');
const BirthdayModel = require('./models/Birthday');
const SuggestionModel = require('./models/Suggestion');
const PollModel = require('./models/Poll');
const LfgSessionModel = require('./models/LfgSession');
const DailyChallengeModel = require('./models/DailyChallenge');
const UserStreakModel = require('./models/UserStreak');
const ReputationModel = require('./models/Reputation');
const TournamentModel = require('./models/Tournament');
const TournamentParticipantModel = require('./models/TournamentParticipant');
const GameNightModel = require('./models/GameNight');
const TagModel = require('./models/Tag');
const FeedbackModel = require('./models/Feedback');
const RecruitModel = require('./models/Recruit');

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
const ReactionRole = ReactionRoleModel(sequelize, DataTypes);
const Reminder = ReminderModel(sequelize, DataTypes);
const Starboard = StarboardModel(sequelize, DataTypes);
const Birthday = BirthdayModel(sequelize, DataTypes);
const Suggestion = SuggestionModel(sequelize, DataTypes);
const Poll = PollModel(sequelize, DataTypes);
const LfgSession = LfgSessionModel(sequelize, DataTypes);
const DailyChallenge = DailyChallengeModel(sequelize, DataTypes);
const UserStreak = UserStreakModel(sequelize, DataTypes);
const Reputation = ReputationModel(sequelize, DataTypes);
const Tournament = TournamentModel(sequelize, DataTypes);
const TournamentParticipant = TournamentParticipantModel(sequelize, DataTypes);
const GameNight = GameNightModel(sequelize, DataTypes);
const Tag = TagModel(sequelize, DataTypes);
const Feedback = FeedbackModel(sequelize, DataTypes);
const Recruit = RecruitModel(sequelize, DataTypes);

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

Guild.hasMany(GuideMessage, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
GuideMessage.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// BP / DKP associations
Guild.hasMany(BpUser, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpUser.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
BpUser.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

Guild.hasMany(BpLootHistory, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpLootHistory.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
BpLootHistory.belongsTo(BpUser, { foreignKey: 'winner_id', targetKey: 'user_id', as: 'winner' });
BpLootHistory.belongsTo(BpItem, { foreignKey: 'item_id', targetKey: 'id', as: 'item' });

Guild.hasMany(BpActiveRoll, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpActiveRoll.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
BpActiveRoll.belongsTo(BpItem, { foreignKey: 'item_id', targetKey: 'id', as: 'item' });

Guild.hasMany(BpRaidRoster, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpRaidRoster.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

Guild.hasMany(BpItem, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
BpItem.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
BpItem.hasMany(BpLootHistory, { foreignKey: 'item_id', sourceKey: 'id' });
BpItem.hasMany(BpActiveRoll, { foreignKey: 'item_id', sourceKey: 'id' });

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

// ReactionRole associations
Guild.hasMany(ReactionRole, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
ReactionRole.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Reminder associations
Guild.hasMany(Reminder, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Reminder.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
User.hasMany(Reminder, { foreignKey: 'user_id', sourceKey: 'user_id' });
Reminder.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

// Starboard associations
Guild.hasMany(Starboard, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Starboard.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Birthday associations
Guild.hasMany(Birthday, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Birthday.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
User.hasOne(Birthday, { foreignKey: 'user_id', sourceKey: 'user_id' });
Birthday.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

// Suggestion associations
Guild.hasMany(Suggestion, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Suggestion.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
User.hasMany(Suggestion, { foreignKey: 'user_id', sourceKey: 'user_id' });
Suggestion.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

// Poll associations
Guild.hasMany(Poll, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Poll.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// LfgSession associations
Guild.hasMany(LfgSession, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
LfgSession.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// DailyChallenge associations
Guild.hasMany(DailyChallenge, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
DailyChallenge.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
User.hasMany(DailyChallenge, { foreignKey: 'user_id', sourceKey: 'user_id' });
DailyChallenge.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

// UserStreak associations
Guild.hasMany(UserStreak, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
UserStreak.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
User.hasMany(UserStreak, { foreignKey: 'user_id', sourceKey: 'user_id' });
UserStreak.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });

// Reputation associations
Guild.hasMany(Reputation, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Reputation.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Tournament associations
Guild.hasMany(Tournament, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Tournament.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });
Tournament.hasMany(TournamentParticipant, { foreignKey: 'tournament_id' });
TournamentParticipant.belongsTo(Tournament, { foreignKey: 'tournament_id' });

// GameNight associations
Guild.hasMany(GameNight, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
GameNight.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Tag associations
Guild.hasMany(Tag, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Tag.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

// Recruit (recruiting pipeline) associations
Guild.hasMany(Recruit, { foreignKey: 'guild_id', sourceKey: 'guild_id' });
Recruit.belongsTo(Guild, { foreignKey: 'guild_id', targetKey: 'guild_id' });

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
  ReactionRole,
  Reminder,
  Starboard,
  Birthday,
  Suggestion,
  Poll,
  LfgSession,
  DailyChallenge,
  UserStreak,
  Reputation,
  Tournament,
  TournamentParticipant,
  GameNight,
  Tag,
  Feedback,
  Recruit,
};
