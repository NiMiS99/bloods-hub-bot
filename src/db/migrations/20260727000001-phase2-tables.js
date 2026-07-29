'use strict';

// Initial migration for new Phase 2 tables: giveaways, custom_commands, scheduled_messages.
// Also adds temp_voice_creator_channel_id to guilds table.
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add temp_voice_creator_channel_id to guilds
    const tableDesc = await queryInterface.describeTable('guilds');
    if (!tableDesc.temp_voice_creator_channel_id) {
      await queryInterface.addColumn('guilds', 'temp_voice_creator_channel_id', {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
      });
    }

    // 2. Create giveaways table
    const giveawaysExists = await queryInterface.tableExists('giveaways').catch(() => false);
    if (!giveawaysExists) {
      await queryInterface.createTable('giveaways', {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        guild_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        channel_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        message_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        title: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        prize: { type: Sequelize.STRING(200), allowNull: false },
        winner_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        required_role_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
        ends_at: { type: Sequelize.DATE, allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        is_ended: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        winners: { type: Sequelize.TEXT, allowNull: true },
        hosted_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
    }

    // 3. Create custom_commands table
    const customCmdExists = await queryInterface.tableExists('custom_commands').catch(() => false);
    if (!customCmdExists) {
      await queryInterface.createTable('custom_commands', {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        guild_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(32), allowNull: false },
        response: { type: Sequelize.TEXT, allowNull: false },
        embed_title: { type: Sequelize.STRING(200), allowNull: true },
        embed_color: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0x8b0000 },
        embed_image: { type: Sequelize.STRING(500), allowNull: true },
        created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
      await queryInterface.addIndex('custom_commands', ['guild_id', 'name'], { unique: true });
    }

    // 4. Create scheduled_messages table
    const scheduledExists = await queryInterface.tableExists('scheduled_messages').catch(() => false);
    if (!scheduledExists) {
      await queryInterface.createTable('scheduled_messages', {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        guild_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        channel_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        content: { type: Sequelize.TEXT, allowNull: false },
        embed_title: { type: Sequelize.STRING(200), allowNull: true },
        embed_color: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true, defaultValue: 0x8b0000 },
        embed_image: { type: Sequelize.STRING(500), allowNull: true },
        cron_expr: { type: Sequelize.STRING(100), allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        last_sent_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      });
    }
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('scheduled_messages').catch(() => {});
    await queryInterface.dropTable('custom_commands').catch(() => {});
    await queryInterface.dropTable('giveaways').catch(() => {});
    await queryInterface.removeColumn('guilds', 'temp_voice_creator_channel_id').catch(() => {});
  },
};
