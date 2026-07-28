-- ============================================================================
--  Bloods Hub Bot — Full MySQL schema
--  Engine: InnoDB   Charset: utf8mb4   Collation: utf8mb4_unicode_ci
--
--  Design goals:
--   * Preserve legacy WoW "Bloods" guild data — no destructive operations.
--   * Track Discord user profiles, per-game profiles, external API stats,
--     voice/text activity, leaderboards caches, and per-guild settings.
--   * Keep referential integrity strict but allow a user to belong to many
--     games (many-to-many) and to have multiple external account links.
--
--  Run order:
--    1. 00_schema.sql        (this file)
--    2. 01_seed_games.sql    (optional seed data)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
--  guilds : per-Discord-server configuration
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guilds` (
  `guild_id`            BIGINT UNSIGNED   NOT NULL COMMENT 'Discord guild snowflake',
  `name`                VARCHAR(100)      NOT NULL,
  `legacy_wow_category_id` BIGINT UNSIGNED NULL COMMENT 'Preserved Bloods WoW category, if any',
  `welcome_channel_id`  BIGINT UNSIGNED NULL,
  `rules_channel_id`    BIGINT UNSIGNED NULL,
  `role_selection_channel_id` BIGINT UNSIGNED NULL,
  `everyone_role_id`    BIGINT UNSIGNED NULL COMMENT 'Usually the @everyone role id',
  `mod_log_channel_id`  BIGINT UNSIGNED NULL,
  `settings`            JSON              NULL COMMENT 'Arbitrary key/value overrides',
  `created_at`          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`guild_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  users : Discord member profile (one row per Discord user, server-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id`      BIGINT UNSIGNED  NOT NULL COMMENT 'Discord user snowflake',
  `guild_id`     BIGINT UNSIGNED  NOT NULL,
  `username`     VARCHAR(32)      NOT NULL COMMENT 'Snapshot of display name',
  `legacy_wow_member` TINYINT(1)  NOT NULL DEFAULT 0 COMMENT 'Carried over from Bloods roster',
  `legacy_wow_rank`   VARCHAR(50) NULL     COMMENT 'Original WoW guild rank (GM, Officer, Member...)',
  `joined_discord_at` TIMESTAMP  NULL,
  `last_seen_at`      TIMESTAMP  NULL,
  `total_voice_seconds`  INT UNSIGNED NOT NULL DEFAULT 0,
  `total_messages`       INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `guild_id`),
  KEY `idx_users_guild` (`guild_id`),
  CONSTRAINT `fk_users_guild` FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`guild_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  games : catalog of supported games (one row per game)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `games` (
  `id`            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(32)       NOT NULL COMMENT 'Stable slug, e.g. "wow", "valorant", "steam_csgo"',
  `name`          VARCHAR(100)      NOT NULL,
  `category`      VARCHAR(50)       NOT NULL COMMENT 'mmo | fps | moba | strategy | sandbox',
  `api_provider`  VARCHAR(50)       NULL     COMMENT 'steam | battlenet | riot | manual | none',
  `role_id`       BIGINT UNSIGNED   NULL     COMMENT 'Discord role granting access to this game category',
  `category_id`   BIGINT UNSIGNED   NULL     COMMENT 'Discord category channel id (private to role)',
  `icon_url`      VARCHAR(255)      NULL,
  `color_hex`     INT UNSIGNED      NOT NULL DEFAULT 0x5865F2,
  `is_active`     TINYINT(1)        NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_games_code` (`code`),
  KEY `idx_games_provider` (`api_provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  user_games : many-to-many membership of a user in a game community
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_games` (
  `user_id`     BIGINT UNSIGNED  NOT NULL,
  `guild_id`    BIGINT UNSIGNED  NOT NULL,
  `game_id`     SMALLINT UNSIGNED NOT NULL,
  `joined_at`   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `self_assigned` TINYINT(1)     NOT NULL DEFAULT 1 COMMENT 'Via role-selection UI',
  PRIMARY KEY (`user_id`, `guild_id`, `game_id`),
  KEY `idx_ug_game` (`game_id`),
  CONSTRAINT `fk_ug_user`  FOREIGN KEY (`user_id`,`guild_id`) REFERENCES `users`(`user_id`,`guild_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ug_game`  FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  external_accounts : links between Discord users and external platform IDs
--  (SteamID64, Battle.net tag, Riot PUUID, etc.) — used by API services.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `external_accounts` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED NOT NULL,
  `guild_id`     BIGINT UNSIGNED NOT NULL,
  `provider`     VARCHAR(32)  NOT NULL COMMENT 'steam | battlenet | riot',
  `external_id`  VARCHAR(100) NOT NULL COMMENT 'SteamID64, BattleTag, PUUID...',
  `region`       VARCHAR(8)   NULL     COMMENT 'eu | us | kr | sea ... (Battle.net/Riot)',
  `verified`     TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ext_link` (`provider`,`external_id`),
  KEY `idx_ext_user` (`user_id`,`guild_id`),
  CONSTRAINT `fk_ext_user` FOREIGN KEY (`user_id`,`guild_id`) REFERENCES `users`(`user_id`,`guild_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  game_stats : per-user, per-game stat rows (one per metric)
--  Allows flexible metrics without schema changes per game.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_stats` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED  NOT NULL,
  `guild_id`     BIGINT UNSIGNED  NOT NULL,
  `game_id`      SMALLINT UNSIGNED NOT NULL,
  `metric`       VARCHAR(64)      NOT NULL COMMENT 'playtime_seconds | rank | kd | mmr | score ...',
  `value_num`    DOUBLE           NULL,
  `value_str`    VARCHAR(100)     NULL,
  `updated_at`   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stat` (`user_id`,`guild_id`,`game_id`,`metric`),
  KEY `idx_stat_game_metric` (`game_id`,`metric`,`value_num`),
  CONSTRAINT `fk_stat_user` FOREIGN KEY (`user_id`,`guild_id`) REFERENCES `users`(`user_id`,`guild_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stat_game` FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  activity_log : raw event log for voice/text activity (for analytics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activity_log` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      BIGINT UNSIGNED  NOT NULL,
  `guild_id`     BIGINT UNSIGNED  NOT NULL,
  `event_type`   VARCHAR(20)      NOT NULL COMMENT 'voice_join | voice_leave | message | voice_seconds',
  `channel_id`   BIGINT UNSIGNED  NULL,
  `game_id`      SMALLINT UNSIGNED NULL COMMENT 'If channel belongs to a game category',
  `amount`       INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT 'seconds or message count',
  `occurred_at`  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_act_user_time` (`user_id`,`guild_id`,`occurred_at`),
  KEY `idx_act_game_time` (`game_id`,`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  leaderboard_cache : cached leaderboard snapshots (refreshed by cron)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leaderboard_cache` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `guild_id`     BIGINT UNSIGNED NOT NULL,
  `game_id`      SMALLINT UNSIGNED NULL COMMENT 'NULL = cross-game / Discord activity',
  `metric`       VARCHAR(64)  NOT NULL,
  `scope`        VARCHAR(20)  NOT NULL DEFAULT 'guild' COMMENT 'guild | global',
  `payload`      JSON         NOT NULL COMMENT 'Array of {userId, rank, value, displayName}',
  `generated_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lb_lookup` (`guild_id`,`game_id`,`metric`,`scope`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  game_meta : cached meta/patch/server-status info per game
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `game_meta` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `game_id`      SMALLINT UNSIGNED NOT NULL,
  `kind`         VARCHAR(20)  NOT NULL COMMENT 'patch | meta | server_status',
  `title`        VARCHAR(200) NOT NULL,
  `body`         TEXT         NULL,
  `url`          VARCHAR(255) NULL,
  `fetched_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meta_game_kind` (`game_id`,`kind`,`fetched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
--  audit_log : staff actions performed through bot admin commands
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `guild_id`     BIGINT UNSIGNED NOT NULL,
  `actor_id`     BIGINT UNSIGNED NOT NULL,
  `action`       VARCHAR(64)  NOT NULL,
  `target_type`  VARCHAR(32)  NULL,
  `target_id`    VARCHAR(64)  NULL,
  `details`      JSON         NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_guild_time` (`guild_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
