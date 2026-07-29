// src/db/models/Suggestion.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'suggestion',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      content: { type: DataTypes.STRING(500), allowNull: false },
      upvotes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      downvotes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.ENUM('open', 'approved', 'rejected', 'implemented'), allowNull: false, defaultValue: 'open' },
      voted_users: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    },
    {
      tableName: 'suggestions',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'status'] },
      ],
    }
  );
};
