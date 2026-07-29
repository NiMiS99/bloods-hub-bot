// src/db/models/Tag.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'tag',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      guild_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(50), allowNull: false },
      content: { type: DataTypes.TEXT, allowNull: false },
      created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      category: { type: DataTypes.STRING(50), allowNull: true },
      uses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'tags',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['guild_id', 'name'] },
      ],
    }
  );
};
