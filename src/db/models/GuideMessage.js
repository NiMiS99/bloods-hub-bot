// src/db/models/GuideMessage.js
// Tracks pinned guide messages posted by the bot in various channels.
// Each row = one guide message in one channel.
module.exports = (sequelize, DataTypes) => {
  const GuideMessage = sequelize.define('GuideMessage', {
    guild_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    channel_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    guide_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    game_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null for game_selection, set for per-game guides
    },
  }, {
    tableName: 'guide_messages',
    indexes: [
      { unique: true, fields: ['guild_id', 'channel_id', 'guide_type', 'game_id'] },
      { fields: ['guild_id'] },
    ],
  });
  return GuideMessage;
};
