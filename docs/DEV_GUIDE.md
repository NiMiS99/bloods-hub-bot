# DEV_GUIDE — Bloods Hub Bot

Audience: **sviluppatori** che mantengono il bot, aggiungono feature, evolvono lo schema e deployano aggiornamenti.

---

## 1. Struttura del progetto

```
bloods-hub-bot/
├── src/
│   ├── index.js               # Entry point: avvia bot + dashboard server
│   ├── config/index.js        # Loader variabili d'ambiente (.env)
│   ├── commands/              # 71 comandi slash (auto-load ricorsivo)
│   │   ├── admin/             # 20 comandi admin (setup, game, giveaway, ...)
│   │   ├── mod/               # 9 comandi moderazione (mute, warn, purge, ...)
│   │   └── *.js               # 42 comandi pubblici (bp, raid, lfg, music, ...)
│   ├── events/                # 12 event handler Discord (auto-load)
│   ├── handlers/              # Command + event handler
│   ├── services/              # 50+ servizi
│   │   ├── api/               # Provider API esterne (Steam, Battle.net, Riot)
│   │   ├── xpService.js       # Sistema XP con curva quadratica
│   │   ├── raidEligibilityChecker.js
│   │   ├── raidAttendanceService.js
│   │   ├── automodService.js
│   │   ├── musicService.js    # @discordjs/voice + play-dl
│   │   └── ...
│   ├── server/                # Express API
│   │   ├── dashboardServer.js # Server principale (port 4567)
│   │   ├── healthServer.js    # Health check separato (port 3001)
│   │   ├── middleware/        # auth.js (JWT), validate.js (input)
│   │   └── routes/            # 21 file route (tutte protette tranne public.js)
│   ├── db/                    # Sequelize ORM
│   │   ├── index.js           # Istanza + associazioni
│   │   ├── migrations/        # 4 migrazioni
│   │   └── models/            # 40 modelli Sequelize
│   ├── modules/games/         # 9 game meta fetcher (wow, lol, valorant, ...)
│   ├── ui/                    # Interazioni componenti Discord
│   └── utils/                 # logger, embed, format, permissions, audit
├── dashboard/                 # Next.js 14 (static export)
│   └── src/
│       ├── app/               # 7 pagine pubbliche + 30+ admin
│       ├── components/        # Componenti React condivisi
│       └── lib/               # siteConfig, utils, API client
├── tests/                     # 5 suite test (293 assertions)
│   ├── pipeline.js            # 217 assertions (logica servizi)
│   ├── unit.test.js           # 37 assertions (XP, BP, RaidService)
│   ├── api.test.js            # 16 assertions (API integration)
│   ├── e2e.test.js            # 23 assertions (E2E smoke)
│   └── smoke.test.js          # Smoke test build
├── scripts/                   # Script utility (audit, backup, migrate)
├── docs/                      # Documentazione
├── Dockerfile                 # Container build
├── docker-compose.yml         # Bot + MySQL
├── ecosystem.config.js        # PM2 config
├── eslint.config.js           # Linting config
└── .env.example               # Template variabili
```

### Convenzioni

- **CommonJS** ovunque (`require`/`module.exports`) — niente ESM
- Comandi: auto-discovery da `src/commands/**/`. Ogni file esporta `{ data: SlashCommandBuilder, execute }`
- Eventi: auto-discovery da `src/events/`. Ogni file esporta `{ name, once?, execute }`
- DB: Sequelize models in `src/db/models/`, uno per tabella. Mai SQL raw tranne aggregazioni critiche
- Embed: usa helper `src/utils/embed.js` per branding coerente
- UI: tutti i testi in italiano, codice in inglese

---

## 2. Sviluppo locale

```bash
cp .env.example .env          # riempi DISCORD_TOKEN, DB, API keys
npm install
npm run db:migrate             # crea/aggiorna tabelle (idempotente)
npm run seed                   # inserisce giochi di default
npm run deploy:commands        # registra slash command su Discord
npm run dev                    # nodemon — auto-restart
```

Per la dashboard:
```bash
cd dashboard && npm install && npm run dev    # dev server Next.js
npm run dashboard:build                        # build static export
```

---

## 3. Database

### Modelli principali (40 tabelle)

| Modello | Tabella | Scopo |
|---------|---------|-------|
| Guild | guilds | Config per-server (channel IDs, settings JSON) |
| User | users | Profilo membro (XP, livello, messaggi, voice) |
| Game | games | Catalogo giochi (role_id, category_id, api_provider) |
| UserGame | user_games | Membership molti-a-molti (self-role panel) |
| BpUser | bp_users | Saldo Bloods Points per utente |
| BpLootHistory | bp_loot_history | Storico loot assegnati |
| BpActiveRoll | bp_active_rolls | Roll attivi per loot in corso |
| BpRaidRoster | bp_raid_roster | Roster raid mitico (20 player) |
| RaidConfig | raid_configs | Config raid (giorni, orari, requisiti) |
| RaidEligibility | raid_eligibilities | Check eligibilità per utente |
| RaidAttendance | raid_attendances | Presenze per sessione raid |
| ActivityLog | activity_logs | Log eventi voice/message |
| AuditLog | audit_logs | Trail azioni admin |
| CommunityEvent | community_events | Eventi community |
| Giveaway | giveaways | Giveaway attivi/passati |
| Tournament | tournaments | Tornei |
| Warning | warnings | Warn moderazione |
| Suggestion | suggestions | Suggerimenti membri |
| Feedback | feedbacks | Feedback membri |

### Aggiungere una colonna/tabella

1. Crea migrazione in `src/db/migrations/` con timestamp
2. Aggiorna il modello Sequelize in `src/db/models/`
3. Esegui `npm run db:migrate`
4. Aggiorna test se necessario

---

## 4. Aggiungere un nuovo comando slash

1. Crea `src/commands/<name>.js` (o `src/commands/<category>/<name>.js`)
2. Esporta:
```js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('foo').setDescription('…'),
  async execute(interaction, client) { /* … */ },
  // optional: async autocomplete(interaction) { … }
};
```
3. Restart del bot (auto-load) + `npm run deploy:commands`

### Routing interazioni

`src/events/interactionCreate.js` smista:
- `isChatInputCommand` → `client.commands.get(name).execute`
- `isButton` / `isStringSelectMenu` → routing per prefix customId (`role:`, `ticket:`, `event:`, `lfg:`, `spedizione:`)
- `isAutocomplete` → `command.autocomplete`

---

## 5. API REST

### Route protette (admin)
Tutte le route in `src/server/routes/` (tranne `public.js`) usano:
```
requireAuth(jwtSecret) → requireGuildMember(client) → requireAdmin()
```

### Route pubbliche (no auth)
`src/server/routes/public.js` espone endpoint read-only cached 60s:
- `GET /api/public/info` — stats gilda
- `GET /api/public/leaderboard` — classifiche
- `GET /api/public/events` — eventi attivi
- `GET /api/public/raid` — config + roster raid
- `GET /api/public/bp/leaderboard` — classifica BP
- `GET /api/public/bp/loot` — loot recente
- `GET /api/public/giveaways` — giveaway attivi
- `GET /api/public/tournaments` — tornei attivi
- `GET /api/public/hall-of-fame` — hall of fame
- `GET /api/public/discord-widget` — widget Discord
- `GET /api/public/docs` — endpoint docs

### Aggiungere una nuova route API

1. Crea `src/server/routes/<name>.js`
2. Esporta funzione che riceve `(client, jwtSecret)` e restituisce `express.Router()`
3. Proteggi con `requireAuth` + `requireGuildMember` + `requireAdmin`
4. Registra in `src/server/dashboardServer.js`

---

## 6. Aggiungere una nuova game API

Il provider abstraction vive in `src/services/api/`. Ogni provider estende `BaseGameApi`:

```js
async fetchProfile(externalId, region?)   // -> normalized profile object
async fetchStats(externalId, region?)     // -> [{ metric, valueNum?, valueStr? }]
async refreshForUser(models, user, account)  // inherited — upserts into game_stats
```

### Step: aggiungere un nuovo provider

1. Crea `src/services/api/<provider>Api.js` estendendo `BaseGameApi`
2. Registra in `src/services/api/index.js` con `case '<provider>'`
3. Aggiungi env var in `.env.example` e `src/config/index.js`
4. Aggiungi il gioco via `/game add` o `seed.js`
5. Test: `/link <provider> <accountId>` + `/refreshstats`

### Meta fetcher per gioco

Per patch note/meta/server status: crea `src/modules/games/<gameCode>.js` con `fetchMeta()` che restituisce `[{ kind, title, body?, url? }]`. Il `MetaScheduler` lo esegue ogni 6 ore.

---

## 7. Activity tracking & leaderboards

- **Voice**: `ActivityTracker` ticka ogni 60s, calcola secondi in vocale, incrementa `users.total_voice_seconds`
- **Messaggi**: `messageCreate` incrementa `users.total_messages` e logga in `activity_logs`
- **Stats esterne**: `/refreshstats` chiama i provider API che upsertano `game_stats`
- **Leaderboard cache**: `LeaderboardScheduler` ogni 5 min ricostruisce `leaderboard_cache`

---

## 8. Sicurezza

- **JWT**: cookie httpOnly + secure + sameSite=lax, 7 giorni
- **CORS**: environment-aware (`bloodswow.it` in prod, `localhost` in dev)
- **Rate limiting**: 100 req/15min API, 5 req/15min auth, 60 req/15min pubbliche
- **Helmet**: HSTS preload, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Body sanitizer**: strip HTML tags + max 5000 char (anti-XSS)
- **Input validation**: middleware `requireBodyFields`, `validateString`, `isValidDiscordId`, `isValidCron`
- **Audit log**: ogni azione admin nel DB
- **Music service**: graceful error handling per servizi non disponibili
- Il bot non logga mai token o API key

---

## 9. Test

```bash
npm run test:all      # 293 assertions totali
npm run test:pipeline # 217 assertions — logica servizi
npm run test:unit     # 37 assertions — XP, BP, RaidService
npm run test:api      # 16 assertions — API integration (mock)
npm run test:e2e      # 23 assertions — E2E smoke (dashboard + sito)
```

CI/CD: GitHub Actions esegue lint, smoke, pipeline, unit, API, E2E, e dashboard build.

---

## 10. Deploy

### PM2 (produzione attuale)
```bash
npm run dashboard:build         # build frontend
pm2 restart bloods-hub-bot --update-env
pm2 save
```

### Docker
```bash
docker compose up -d --build    # bot + MySQL con healthcheck e log rotation
```

### Update produzione
```bash
git pull
npm ci --omit=dev
npm run db:migrate
npm run deploy:commands
npm run dashboard:build
pm2 restart bloods-hub-bot --update-env
pm2 save
```

---

## 11. Logging

- Winston logger (`src/utils/logger.js`)
- Log giornalieri rotanti in `logs/` (14 giorni retention, 30gg errori)
- `LOG_LEVEL=debug` per output verbose
- `DB_LOGGING=true` per log ogni query SQL

---

## 12. Configuration

Tutte le variabili in `.env` (vedi `.env.example`):

| Variabile | Obbligatoria | Descrizione |
|-----------|-------------|-------------|
| DISCORD_TOKEN | Sì | Token bot Discord |
| DISCORD_CLIENT_ID | Sì | Client ID applicazione |
| GUILD_ID | Sì | ID server principale |
| DB_HOST/PORT/NAME/USER/PASSWORD | Sì | Credenziali MySQL |
| JWT_SECRET | Sì | Secret JWT (min 32 char) |
| DISCORD_CLIENT_SECRET | Sì | OAuth2 client secret |
| DASHBOARD_URL | Sì | URL dashboard (https://bloodswow.it) |
| STEAM_API_KEY | No | API Steam |
| BATTLE_NET_CLIENT_ID/SECRET | No | API Battle.net |
| RIOT_API_KEY | No | API Riot |
| WCL_CLIENT_ID/SECRET | No | Warcraft Logs API |
| GOW_API_KEY | No | Guilds of WoW management API |
| ALERT_WEBHOOK_URL | No | Webhook alert Discord |

---

## 13. Servizi background (55+)

Il bot avvia automaticamente questi servizi in `src/index.js`:

| Servizio | File | Frequenza | Scopo |
|----------|------|-----------|-------|
| ActivityTracker | activityTracker.js | 60s | Voice time + XP |
| LeaderboardScheduler | leaderboardScheduler.js | 5min | Cache classifiche |
| MetaScheduler | metaScheduler.js | 6h | Patch note/meta per gioco |
| NewsPoster | newsPoster.js | 30min | Auto-post news WoW |
| RaidScheduler | raidScheduler.js | 1h | Promemoria pre-raid |
| WarcraftLogsService | warcraftLogsService.js | 5min | Auto-post nuovi WCL |
| AffixScheduler | affixScheduler.js | Martedì 10:05 | Affix M+ settimanali |
| WeeklyKeysPoster | weeklyKeysPoster.js | Lunedì 20:00 | Recap key M+ |
| PatchAlertService | patchAlertService.js | 6h | Alert nuovo patch WoW |
| AttendanceFlagService | attendanceFlagService.js | Lunedì 09:00 | Flag <50% attendance |
| RaidAttendanceService | raidAttendanceService.js | Event-driven | BP da presenze |
| MemberCounterService | memberCounterService.js | 5min | Counter vocale membri |
| BirthdayService | birthdayService.js | Giornaliero 09:00 | Auguri compleanno |
| **DynamicStatusService** | dynamicStatusService.js | 60s | Status bot dinamico |
| **RaidSummaryService** | raidSummaryService.js | Giornaliero 23:59 | Riepilogo post-raid |
| **TwitchAlertService** | twitchAlertService.js | 2min | Auto-announce stream membri |
| MilestoneService | milestoneService.js | Event-driven | Milestone membri |
| WeeklyStatsService | weeklyStatsService.js | Domenica 18:00 | Stats settimanali |
| GuildChallengeService | guildChallengeService.js | Event-driven | Challenge community |
| AutomodService | automodService.js | Event-driven | Filtro parole/spam |
| AntiRaidService | antiRaidService.js | Event-driven | Anti-raid |
| WelcomeService | welcomeService.js | Event-driven | Welcome nuovi membri |
| StarboardService | starboardService.js | Event-driven | Starboard |
| LfgService | lfgService.js | 5min | Scadenza sessioni LFG |
| ChallengeService | challengeService.js | 1h | Scadenza challenge |
| GameNightService | gameNightService.js | 10min | Game night scheduling |
| FeedbackService | feedbackService.js | 30s | Watcher fix completati |
| GiveawayService | giveawayService.js | 30s | Sorteggi giveaway |
| ScheduledMessageService | scheduledMessageService.js | Cron | Messaggi programmati |
| ReminderService | reminderService.js | 30s | Promemoria utenti |
| AlertService | alertService.js | Event-driven | Alert memoria/errori |
| BackupScheduler | backupScheduler.js | Giornaliero | Backup DB |
| CleanupScheduler | cleanupScheduler.js | Settimanale | Pulizia dati vecchi |

### Integrazioni WoW esterne

| Servizio | File | API | Stato |
|----------|------|-----|-------|
| Battle.net API | api/battleNetApi.js | Blizzard OAuth | Attivo |
| Warcraft Logs | warcraftLogsService.js | WCL v2 API | Attivo (richiede WCL_CLIENT_ID/SECRET) |
| **Guilds of WoW** | **gowService.js** | GoW v1 API | Pronto (richiede GOW_API_KEY) |
| **Raider.IO** | **api/raiderIoApi.js** | Raider.IO v1 | Pronto (pubblica, no key) |

---

## 14. Testing checklist before a release

- [ ] `npm run db:migrate` runs clean
- [ ] `npm run deploy:commands` registers all commands
- [ ] `npm run test:all` — 293 assertions pass
- [ ] `npm run dashboard:build` — build senza errori
- [ ] Pagine pubbliche: homepage, chi-siamo, raid, unisciti, classifiche, eventi, hall-of-fame (200 OK)
- [ ] Dashboard admin: login OAuth → pagine accessibili → dati caricati
- [ ] Graceful shutdown: `pm2 stop` — bot logga "Shutdown complete."
