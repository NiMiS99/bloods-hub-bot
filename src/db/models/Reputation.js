// src/db/models/Reputation.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'reputation',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      from_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      to_user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      reason: { type: DataTypes.STRING(300), allowNull: true },
      amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      tableName: 'reputations',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'to_user_id'] },
        { fields: ['guild_id', 'from_user_id'] },
      ],
    }
  );
};
