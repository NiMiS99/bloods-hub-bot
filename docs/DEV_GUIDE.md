# DEV_GUIDE — Bloods Hub Bot

Audience: **developers** maintaining the bot, adding game APIs, evolving the schema, and deploying updates.

---

## 1. Project layout

```
bloods-hub-bot/
├── db/
│   ├── 00_schema.sql          # full MySQL DDL (idempotent)
│   └── 01_seed_games.sql      # default games catalog
├── deploy/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── ecosystem.config.cjs   # PM2
│   └── VPS_DEPLOY.md
├── docs/
│   ├── ADMIN_GUIDE.md
│   └── DEV_GUIDE.md           # this file
├── src/
│   ├── index.js               # entry point
│   ├── config/index.js        # env-var loader
│   ├── commands/              # slash commands (auto-loaded, recursive)
│   │   ├── admin/
│   │   │   ├── game.js
│   │   │   ├── rolepanel.js
│   │   │   └── setup.js
│   │   ├── leaderboard.js
│   │   ├── profile.js
│   │   ├── link.js
│   │   ├── refreshstats.js
│   │   ├── gamemeta.js
│   │   ├── stats.js
│   │   └── ping.js
│   ├── events/                # Discord gateway event listeners (auto-loaded)
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── services/
│   │   ├── activityTracker.js
│   │   ├── leaderboardScheduler.js
│   │   ├── metaScheduler.js
│   │   └── api/
│   │       ├── baseApi.js
│   │       ├── steamApi.js
│   │       ├── battleNetApi.js
│   │       ├── riotApi.js
│   │       └── index.js       # provider registry
│   ├── modules/games/         # per-game meta fetchers (one file per game code)
│   ├── ui/
│   │   ├── roleSelection.js
│   │   └── roleSelectionInteractions.js
│   ├── db/
│   │   ├── index.js           # sequelize instance + associations
│   │   └── models/            # one Sequelize model per table
│   ├── scripts/
│   │   ├── deploy-commands.js
│   │   ├── migrate.js
│   │   └── seed.js
│   └── utils/
│       ├── logger.js
│       ├── embed.js
│       └── format.js
└── package.json
```

### Conventions

- **CommonJS** (`require`/`module.exports`) — no ESM config headaches on Windows/Linux.
- Slash commands are auto-discovered from `src/commands/**/<file>.js`. Each must export `{ data: SlashCommandBuilder, execute }` (and optionally `autocomplete`).
- Events are auto-discovered from `src/events/<file>.js`. Each exports `{ name, once?, execute }`.
- DB access goes through the Sequelize models exported from `src/db`. Never use raw SQL in commands except for performance-critical aggregations (see `leaderboardScheduler._upsert`).
- All embeds use the helpers in `src/utils/embed.js` for consistent branding.

---

## 2. Local development

```bash
cp .env.example .env          # fill in DISCORD_TOKEN, DB creds, API keys
npm install
npm run migrate               # creates tables (idempotent)
npm run seed                  # inserts default games catalog
npm run deploy:commands       # registers slash commands (guild-scoped if GUILD_ID set)
npm run dev                   # nodemon — auto-restart on file changes
```

Recommended: use a local MySQL (or `docker compose up db` to run only the DB container).

---

## 3. Database schema

See `db/00_schema.sql` for the canonical DDL. Sequelize models in `src/db/models` mirror it 1:1 and are kept in sync via `sequelize.sync({ alter: false })` at startup (creates missing tables only — never drops).

### Tables

| Table | Purpose |
|-------|---------|
| `guilds` | Per-server config (channel ids, everyone role, settings JSON). |
| `users` | Discord member profile, server-scoped (composite PK `user_id, guild_id`). Carries `legacy_wow_member` / `legacy_wow_rank`. |
| `games` | Catalog of supported games. `role_id` & `category_id` link to Discord. `api_provider` selects the integration. |
| `user_games` | Many-to-many membership (self-assigned via role panel). |
| `external_accounts` | Links Discord users to SteamID64 / BattleTag / Riot PUUID. |
| `game_stats` | Flexible per-user-per-game metrics (`metric` + `value_num`/`value_str`). |
| `activity_log` | Raw voice/message event log for analytics. |
| `leaderboard_cache` | Cached leaderboard snapshots (refreshed every 5 min by the scheduler). |
| `game_meta` | Cached patch/meta/server-status entries per game. |
| `audit_log` | Staff action audit trail. |

### Adding a column / table

1. Add the column to `db/00_schema.sql` (use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for idempotency, or write a new `db/02_*.sql` migration file).
2. Update the corresponding Sequelize model in `src/db/models/<Model>.js`.
3. Re-run `npm run migrate`.
4. If the change is breaking, bump the migration file number and document it here.

---

## 4. Adding a new game API

The provider abstraction lives in `src/services/api/`. Each provider extends `BaseGameApi` and implements:

```js
async fetchProfile(externalId, region?)   // -> normalized profile object
async fetchStats(externalId, region?)     // -> [{ metric, valueNum?, valueStr? }]
async refreshForUser(models, user, account)  // inherited — upserts into game_stats
```

### Step-by-step: add a new provider (e.g. "epic")

1. **Create the client** — `src/services/api/epicApi.js`:
   ```js
   const BaseGameApi = require('./baseApi');
   class EpicApi extends BaseGameApi {
     constructor(gameCode) { super({ provider: 'epic', gameCode }); }
     get enabled() { return Boolean(process.env.EPIC_API_KEY); }
     async fetchStats(accountId, region) {
       // call Epic API, return [{ metric: 'wins', valueNum: 12 }, ...]
     }
   }
   module.exports = EpicApi;
   ```
2. **Register it** — in `src/services/api/index.js` add a `case 'epic'` and `register('epic', '<gameCode>')` for each game using it.
3. **Add env var** — `EPIC_API_KEY` to `.env.example` and `src/config/index.js`.
4. **Add the game** — either via `/game add` (sets `api_provider=epic`) or insert a row into `games` directly.
5. **Test** — `/link epic <accountId>` then `/refreshstats`.

### Adding a new game to an existing provider

Just `register('<provider>', '<newGameCode>')` in `src/services/api/index.js` and add a row to the `games` table (via `/game add` or `seed.js`). No other code changes needed if the provider already supports the game's endpoints.

### Per-game meta fetchers

For patch notes / meta / server status that don't come from a stats API, add a file `src/modules/games/<gameCode>.js` exporting `fetchMeta()` returning `[{ kind, title, body?, url? }]`. The `MetaScheduler` will pick it up automatically every 6 hours. See `src/modules/games/wow.js` and `_template.js`.

---

## 5. Adding a new slash command

1. Create `src/commands/<name>.js` (or `src/commands/<category>/<name>.js`).
2. Export:
   ```js
   const { SlashCommandBuilder } = require('discord.js');
   module.exports = {
     data: new SlashCommandBuilder().setName('foo').setDescription('…'),
     async execute(interaction, client) { /* … */ },
     // optional: async autocomplete(interaction) { … }
   };
   ```
3. Restart the bot (auto-loads) and run `npm run deploy:commands` to register with Discord.

### Interaction routing

`src/events/interactionCreate.js` routes:
- `isChatInputCommand` → `client.commands.get(name).execute`
- `isButton` / `isStringSelectMenu` → customId prefix `role:` → `src/ui/roleSelectionInteractions.js`. To add new component groups, extend the prefix routing there (e.g. `vote:`, `ticket:`).
- `isAutocomplete` → `command.autocomplete`.

---

## 6. Activity tracking & leaderboards

- **Voice time**: `ActivityTracker` (`src/services/activityTracker.js`) ticks every `ACTIVITY_TRACK_INTERVAL_MS` (default 60s), computes elapsed seconds per connected member, increments `users.total_voice_seconds`, and writes `activity_log` rows of type `voice_seconds`.
- **Messages**: `messageCreate` event increments `users.total_messages` and writes `activity_log` rows of type `message`.
- **External stats**: `refreshstats` command calls each provider's `refreshForUser`, which upserts `game_stats` rows.
- **Leaderboard cache**: `LeaderboardScheduler` runs every 5 min (cron) and rebuilds `leaderboard_cache` rows for every (guild, game, metric) combination it finds, plus the two Discord-activity metrics. `/leaderboard` reads from cache and falls back to a live query if no cache row exists yet.

To add a new leaderboard metric, just write `game_stats` rows with that `metric` value — the scheduler will pick it up automatically.

---

## 7. Configuration & environment

All config is read in `src/config/index.js` from `.env`. Required vars throw at startup; optional ones default sensibly. See `.env.example` for the full list.

API keys are optional per provider — if a key is missing, `provider.enabled` returns `false` and `refreshForUser` soft-fails (logged at warn level) rather than crashing.

---

## 8. Deployment

Two supported paths, both documented in `deploy/`:

- **Docker** — `deploy/docker-compose.yml` runs MySQL + the bot together. `docker compose --env-file .env up -d --build`. The schema is auto-loaded from `db/` via MySQL's `docker-entrypoint-initdb.d`.
- **Bare-metal / PM2** — see `deploy/VPS_DEPLOY.md` and `deploy/ecosystem.config.cjs`.

### Updating a production deployment

```bash
git pull
npm ci --omit=dev
npm run migrate           # idempotent — safe to run any time
npm run deploy:commands   # re-register slash commands
pm2 restart bloods-hub-bot   # or: docker compose up -d --build
```

---

## 9. Logging & observability

- Winston logger (`src/utils/logger.js`) writes to console + daily-rotating files in `logs/` (`bot-YYYY-MM-DD.log`, `error-YYYY-MM-DD.log`, 14/30 day retention).
- Set `LOG_LEVEL=debug` for verbose output, `DB_LOGGING=true` to log every SQL query.
- PM2/Docker both capture stdout/stderr.

---

## 10. Security notes

- The bot DB user should be a **dedicated low-privilege user** with grants only on the `bloods_hub` database.
- `.env` is gitignored — never commit real tokens. Use Discord's developer portal to rotate the token if it leaks.
- External account IDs (SteamID64, BattleTag, PUUID) are stored in `external_accounts`. They are not sensitive on their own but treat them as PII — do not expose them in public channels. `/profile` only shows them to the user themselves.
- The bot never logs full tokens or API keys; Winston is configured to not serialize `Authorization` headers.

---

## 11. Testing checklist before a release

- [ ] `npm run migrate` runs clean on a fresh DB.
- [ ] `npm run seed` inserts the default games without duplicates.
- [ ] `npm run deploy:commands` registers all commands (check Discord).
- [ ] `/setup run` on a test guild: creates the 3 public channels, locks `@everyone`, preserves a fake "legacy WoW" category.
- [ ] `/game add` creates role + private category; `/rolepanel` lists the new game.
- [ ] Self-role menu grants and removes the role; `user_games` rows match.
- [ ] `/link steam <id>` + `/refreshstats` populates `game_stats` (if Steam key set).
- [ ] `/leaderboard` returns cached rows after the scheduler ticks.
- [ ] Voice accrual: join a voice channel, wait 2 ticks, check `users.total_voice_seconds` increased.
- [ ] Graceful shutdown: `pm2 stop` / `docker compose down` — bot logs "Shutdown complete." with no unhandled rejections.
