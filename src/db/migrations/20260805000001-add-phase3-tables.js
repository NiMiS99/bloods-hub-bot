// src/db/migrations/20260805000001-add-phase3-tables.js
// Migration for all models added after phase2 (feedback, community, raid, etc.)
// This is a "catch-up" migration — it creates tables if they don't exist.
// In production, run with: npx sequelize-cli migration:run

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    // Helper: create table only if it doesn't exist
    async function createIfNotExists(name, definition) {
      if (!tables.includes(name)) {
        await queryInterface.createTable(name, definition);
        console.log(`  Created table: ${name}`);
      } else {
        console.log(`  Skipped (exists): ${name}`);
      }
    }

    // Feedback
    await createIfNotExists('feedback', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      author_id: { type: Sequelize.STRING(20), allowNull: false },
      author_username: { type: Sequelize.STRING(32) },
      channel_id: { type: Sequelize.STRING(20) },
      thread_id: { type: Sequelize.STRING(20) },
      title: { type: Sequelize.STRING(100), allowNull: false },
      category: { type: Sequelize.STRING(50) },
      priority: { type: Sequelize.STRING(20), defaultValue: 'medium' },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(20), defaultValue: 'open' },
      approved_by: { type: Sequelize.STRING(20) },
      approved_at: { type: Sequelize.DATE },
      fix_notes: { type: Sequelize.TEXT },
      fix_commit: { type: Sequelize.STRING(100) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Birthdays
    await createIfNotExists('birthdays', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      day: { type: Sequelize.INTEGER, allowNull: false },
      month: { type: Sequelize.INTEGER, allowNull: false },
      year: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Reminders
    await createIfNotExists('reminders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      content: { type: Sequelize.TEXT },
      remind_at: { type: Sequelize.DATE, allowNull: false },
      is_sent: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Starboard
    await createIfNotExists('starboard_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      channel_id: { type: Sequelize.STRING(20), allowNull: false },
      message_id: { type: Sequelize.STRING(20), allowNull: false },
      starboard_message_id: { type: Sequelize.STRING(20) },
      star_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      content: { type: Sequelize.TEXT },
      author_id: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Tags
    await createIfNotExists('tags', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(50), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      created_by: { type: Sequelize.STRING(20) },
      uses: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Suggestions
    await createIfNotExists('suggestions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      content: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(20), defaultValue: 'open' },
      upvotes: { type: Sequelize.INTEGER, defaultValue: 0 },
      downvotes: { type: Sequelize.INTEGER, defaultValue: 0 },
      message_id: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Polls
    await createIfNotExists('polls', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      question: { type: Sequelize.STRING(200), allowNull: false },
      options: { type: Sequelize.JSON },
      votes: { type: Sequelize.JSON },
      is_closed: { type: Sequelize.BOOLEAN, defaultValue: false },
      message_id: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // LFG sessions
    await createIfNotExists('lfg_sessions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      game_id: { type: Sequelize.STRING(50) },
      activity: { type: Sequelize.STRING(100) },
      max_players: { type: Sequelize.INTEGER, defaultValue: 5 },
      current_players: { type: Sequelize.INTEGER, defaultValue: 1 },
      status: { type: Sequelize.STRING(20), defaultValue: 'open' },
      message_id: { type: Sequelize.STRING(20) },
      scheduled_at: { type: Sequelize.DATE },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Daily challenges
    await createIfNotExists('daily_challenges', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      challenge_date: { type: Sequelize.DATEONLY, allowNull: false },
      completed: { type: Sequelize.BOOLEAN, defaultValue: false },
      reward_claimed: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // User streaks
    await createIfNotExists('user_streaks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      current_streak: { type: Sequelize.INTEGER, defaultValue: 0 },
      longest_streak: { type: Sequelize.INTEGER, defaultValue: 0 },
      last_activity_date: { type: Sequelize.DATEONLY },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Reputations
    await createIfNotExists('reputations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      from_user_id: { type: Sequelize.STRING(20), allowNull: false },
      to_user_id: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.INTEGER, defaultValue: 1 },
      reason: { type: Sequelize.STRING(200) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Tournaments
    await createIfNotExists('tournaments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      game_id: { type: Sequelize.STRING(50) },
      format: { type: Sequelize.STRING(20), defaultValue: 'single_elim' },
      status: { type: Sequelize.STRING(20), defaultValue: 'pending' },
      max_participants: { type: Sequelize.INTEGER },
      started_at: { type: Sequelize.DATE },
      ended_at: { type: Sequelize.DATE },
      created_by: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Tournament participants
    await createIfNotExists('tournament_participants', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tournament_id: { type: Sequelize.INTEGER, allowNull: false },
      user_id: { type: Sequelize.STRING(20), allowNull: false },
      seed: { type: Sequelize.INTEGER },
      eliminated: { type: Sequelize.BOOLEAN, defaultValue: false },
      placement: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Game nights
    await createIfNotExists('game_nights', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      game_id: { type: Sequelize.STRING(50) },
      cron_expr: { type: Sequelize.STRING(50), allowNull: false },
      text_channel_id: { type: Sequelize.STRING(20) },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Reaction roles
    await createIfNotExists('reaction_roles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      message_id: { type: Sequelize.STRING(20), allowNull: false },
      channel_id: { type: Sequelize.STRING(20), allowNull: false },
      emoji: { type: Sequelize.STRING(50), allowNull: false },
      role_id: { type: Sequelize.STRING(20), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Scheduled messages
    await createIfNotExists('scheduled_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      channel_id: { type: Sequelize.STRING(20), allowNull: false },
      content: { type: Sequelize.TEXT },
      embed_title: { type: Sequelize.STRING(200) },
      embed_color: { type: Sequelize.STRING(10) },
      embed_image: { type: Sequelize.STRING(500) },
      cron_expr: { type: Sequelize.STRING(50), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      last_sent_at: { type: Sequelize.DATE },
      created_by: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Custom commands
    await createIfNotExists('custom_commands', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      name: { type: Sequelize.STRING(50), allowNull: false },
      response: { type: Sequelize.TEXT },
      embed_title: { type: Sequelize.STRING(200) },
      embed_color: { type: Sequelize.STRING(10) },
      embed_image: { type: Sequelize.STRING(500) },
      created_by: { type: Sequelize.STRING(20) },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Giveaways
    await createIfNotExists('giveaways', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      channel_id: { type: Sequelize.STRING(20), allowNull: false },
      message_id: { type: Sequelize.STRING(20) },
      prize: { type: Sequelize.STRING(200), allowNull: false },
      winner_count: { type: Sequelize.INTEGER, defaultValue: 1 },
      status: { type: Sequelize.STRING(20), defaultValue: 'active' },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      created_by: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Game modes
    await createIfNotExists('game_modes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      guild_id: { type: Sequelize.STRING(20), allowNull: false },
      game_id: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      server_ip: { type: Sequelize.STRING(100) },
      server_password: { type: Sequelize.STRING(100) },
      max_players: { type: Sequelize.INTEGER },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.STRING(20) },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Add indexes on new tables
    const newTableIndexes = [
      { table: 'feedback', fields: ['guild_id', 'status'] },
      { table: 'feedback', fields: ['guild_id', 'channel_id'] },
      { table: 'feedback', fields: ['author_id'] },
      { table: 'birthdays', fields: ['guild_id', 'user_id'] },
      { table: 'reminders', fields: ['guild_id', 'remind_at'] },
      { table: 'reminders', fields: ['user_id'] },
      { table: 'starboard_messages', fields: ['guild_id'] },
      { table: 'tags', fields: ['guild_id', 'name'] },
      { table: 'suggestions', fields: ['guild_id', 'status'] },
      { table: 'polls', fields: ['guild_id'] },
      { table: 'lfg_sessions', fields: ['guild_id', 'status'] },
      { table: 'tournaments', fields: ['guild_id', 'status'] },
      { table: 'game_nights', fields: ['guild_id', 'is_active'] },
      { table: 'reaction_roles', fields: ['message_id'] },
      { table: 'scheduled_messages', fields: ['guild_id', 'is_active'] },
      { table: 'custom_commands', fields: ['guild_id', 'name'] },
      { table: 'giveaways', fields: ['guild_id', 'status'] },
      { table: 'game_modes', fields: ['guild_id', 'game_id'] },
    ];

    for (const { table, fields } of newTableIndexes) {
      if (tables.includes(table)) {
        const indexName = `idx_${table}_${fields.join('_')}`;
        try {
          await queryInterface.addIndex(table, fields, { name: indexName });
          console.log(`  Added index: ${indexName}`);
        } catch (e) {
          console.log(`  Skipped index (exists): ${indexName}`);
        }
      }
    }
  },

  down: async (queryInterface) => {
    // Don't drop tables in down — data loss risk
    console.log('Down migration: no tables dropped (safety)');
  },
};
