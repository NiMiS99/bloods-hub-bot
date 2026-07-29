'use strict';

// Migration: Add database indexes for performance optimization.
// This can be run safely on existing tables — CREATE INDEX IF NOT EXISTS is not
// supported by MySQL < 8.0, so we catch duplicate errors.

module.exports = {
  async up(queryInterface, Sequelize) {
    const indexes = [
      { table: 'activity_log', name: 'idx_activity_guild_user', fields: ['guild_id', 'user_id'] },
      { table: 'activity_log', name: 'idx_activity_guild_type', fields: ['guild_id', 'event_type'] },
      { table: 'activity_log', name: 'idx_activity_occurred', fields: ['occurred_at'] },
      { table: 'users', name: 'idx_user_guild_level', fields: ['guild_id', 'level'] },
      { table: 'warnings', name: 'idx_warn_guild_user', fields: ['guild_id', 'user_id'] },
      { table: 'warnings', name: 'idx_warn_expires', fields: ['expires_at'] },
      { table: 'reputations', name: 'idx_rep_guild_to', fields: ['guild_id', 'to_user_id'] },
      { table: 'reputations', name: 'idx_rep_guild_from', fields: ['guild_id', 'from_user_id'] },
      { table: 'suggestions', name: 'idx_sugg_guild_status', fields: ['guild_id', 'status'] },
      { table: 'polls', name: 'idx_poll_guild_closed', fields: ['guild_id', 'is_closed'] },
      { table: 'lfg_sessions', name: 'idx_lfg_guild_status', fields: ['guild_id', 'status'] },
      { table: 'daily_challenges', name: 'idx_daily_guild_user_assigned', fields: ['guild_id', 'user_id', 'assigned_at'] },
      { table: 'user_streaks', name: 'idx_streak_guild_user', fields: ['guild_id', 'user_id'] },
      { table: 'tournaments', name: 'idx_tourn_guild_status', fields: ['guild_id', 'status'] },
      { table: 'tournament_participants', name: 'idx_tpart_tourn_user', fields: ['tournament_id', 'user_id'] },
      { table: 'game_nights', name: 'idx_gn_guild_active', fields: ['guild_id', 'is_active'] },
      { table: 'tags', name: 'idx_tag_guild_name', fields: ['guild_id', 'name'] },
      { table: 'giveaways', name: 'idx_give_guild_ended', fields: ['guild_id', 'is_ended'] },
      { table: 'reminders', name: 'idx_reminder_user_sent', fields: ['user_id', 'is_sent'] },
      { table: 'audit_log', name: 'idx_audit_guild_created', fields: ['guild_id', 'created_at'] },
      { table: 'discord_logs', name: 'idx_dlog_guild_type', fields: ['guild_id', 'event_type'] },
      { table: 'leaderboard_cache', name: 'idx_lb_guild_metric', fields: ['guild_id', 'metric'] },
      { table: 'scheduled_messages', name: 'idx_sched_guild_active', fields: ['guild_id', 'is_active'] },
    ];

    for (const { table, name, fields } of indexes) {
      try {
        await queryInterface.addIndex(table, fields, { name });
        console.log(`  + Index ${name} on ${table}`);
      } catch (err) {
        if (err.message.includes('Duplicate key name') || err.message.includes('already exists')) {
          console.log(`  = Index ${name} already exists, skipping`);
        } else {
          console.log(`  ! Index ${name} failed: ${err.message}`);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const indexNames = [
      'idx_activity_guild_user', 'idx_activity_guild_type', 'idx_activity_occurred',
      'idx_user_guild_level', 'idx_warn_guild_user', 'idx_warn_expires',
      'idx_rep_guild_to', 'idx_rep_guild_from', 'idx_sugg_guild_status',
      'idx_poll_guild_closed', 'idx_lfg_guild_status', 'idx_daily_guild_user_assigned',
      'idx_streak_guild_user', 'idx_tourn_guild_status', 'idx_tpart_tourn_user',
      'idx_gn_guild_active', 'idx_tag_guild_name', 'idx_give_guild_ended',
      'idx_reminder_user_sent', 'idx_audit_guild_created', 'idx_dlog_guild_type',
      'idx_lb_guild_metric', 'idx_sched_guild_active',
    ];

    for (const name of indexNames) {
      try {
        await queryInterface.sequelize.query(`DROP INDEX ${name} ON ${name.split('_').slice(1).join('_')}`);
      } catch {
        // Ignore errors on rollback
      }
    }
  },
};
