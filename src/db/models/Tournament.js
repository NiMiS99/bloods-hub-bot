// src/db/models/Tournament.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'tournament',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(200), allowNull: false },
      game: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: true },
      format: { type: DataTypes.ENUM('single_elim', 'double_elim', 'round_robin'), allowNull: false, defaultValue: 'single_elim' },
      max_participants: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 16 },
      status: { type: DataTypes.ENUM('registration', 'in_progress', 'completed', 'cancelled'), allowNull: false, defaultValue: 'registration' },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      started_at: { type: DataTypes.DATE, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      bracket: { type: DataTypes.JSON, allowNull: true },
      current_round: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'tournaments',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'status'] },
      ],
    }
  );
};
