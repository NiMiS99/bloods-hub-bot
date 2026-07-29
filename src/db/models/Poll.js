// src/db/models/Poll.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'poll',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      message_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      channel_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      question: { type: DataTypes.STRING(500), allowNull: false },
      options: { type: DataTypes.JSON, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      is_closed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: 'polls',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'is_closed'] },
      ],
    }
  );
};
