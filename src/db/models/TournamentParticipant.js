// src/db/models/TournamentParticipant.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'tournament_participant',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      tournament_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      seed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      eliminated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      eliminated_round: { type: DataTypes.INTEGER, allowNull: true },
      final_position: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: 'tournament_participants',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['tournament_id', 'user_id'] },
      ],
    }
  );
};
