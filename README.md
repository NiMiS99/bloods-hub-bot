# Bloods Hub Bot

Bot Discord per community multi-gaming, costruito per la transizione da una gilda legacy WoW a un hub community dinamico.

## Stack

- **Node.js** + **discord.js** v14
- **Sequelize** ORM + **MySQL**
- **PM2** process manager
- **Express** 4.x per dashboard API
- **Next.js** 14 + Tailwind CSS per dashboard frontend
- **Winston** logging con rotazione giornaliera
- **Helmet** + **express-rate-limit** per security
- **Docker** + **docker-compose** per containerized deploy

## Quick Start

```bash
# 1. Installa dipendenze
npm install

# 2. Configura .env (copia .env.example e riempi i valori)
cp .env.example .env

# 3. Avvia con PM2 (usa ecosystem.config.js)
pm2 start ecosystem.config.js --env production

# 4. Registra i comandi slash
node src/scripts/deploy-commands.js

# 5. Verifica
node tests/pipeline.js
```

### Dashboard (opzionale)

```bash
cd dashboard && npm install && npm run build
# Servita dal bot su http://localhost:4567/
```

### Docker

```bash
docker compose --env-file .env up -d --build
```

## Comandi (65)

### Utente (25)
| Comando | Descrizione |
|---------|-------------|
| `/ping` | Verifica latenza bot |
| `/help` | Lista tutti i comandi (62) |
| `/mystats [user]` | Profilo community (XP, badge, stat, link) |
| `/mygames` | I tuoi giochi + statistiche |
| `/rank [user]` | Livello, XP, badge, posizione classifica |
| `/rankcard [user]` | Genera immagine carta rank |
| `/stats` | Statistiche community |
| `/serverstats` | Statistiche server con grafici |
| `/serverinfo` | Info server Discord |
| `/members [ruolo]` | Lista membri per ruolo |
| `/leaderboard [game] [metric] [top]` | Classifiche |
| `/gamemeta <game> [kind]` | Patch notes / meta |
| `/link <provider> <id> [region]` | Collega account esterno |
| `/refreshstats [user]` | Aggiorna stat da API |
| `/poll` | Crea sondaggi |
| `/lfg` | Cerca compagni di gioco |
| `/suggest` | Proponi suggerimenti |
| `/event create/list/info/delete` | Gestione eventi community |
| `/bp` | Battle Points (DKP raid system) |
| `/loot` | Gestione loot raid |
| `/raidreq` | Configura requisiti raid |
| `/raidstatus` | Stato idoneità raid |
| `/spedizione` | Gestione spedizioni WoW |
| `/dashboard` | Link dashboard web |
| `/music play/skip/stop/queue/pause/resume` | Player musicale (YouTube + Spotify) |
| `/remind <quando> <cosa>` | Promemoria personale |
| `/birthday set/list` | Compleanni |
| `/tag` | Guide salvate |
| `/thank <user>` | Ringrazia un membro |
| `/search <query>` | Cerca nella documentazione |

### Moderazione (9)
| Comando | Descrizione |
|---------|-------------|
| `/userinfo <user>` | Info dettagliate membro |
| `/purge <n> [user]` | Bulk delete messaggi |
| `/warn <user> <motivo> [severita]` | Assegna warning + ruolo + escalation |
| `/clearwarn <user>` | Rimuovi tutti i warning + ruolo |
| `/warnings <user>` | Storico warning |
| `/mute <user> <durata> [motivo]` | Timeout membro |
| `/unmute <user>` | Rimuovi timeout |
| `/slowmode <canale> <secondi>` | Imposta slowmode |
| `/lockdown [stato]` | Lockdown server |

### Admin (18)
| Comando | Descrizione |
|---------|-------------|
| `/game add/list/remove/update` | Gestione catalogo giochi |
| `/gamemode add/edit/remove/list/post` | Gestione server privati community |
| `/rolepanel` | Pannello selezione giochi |
| `/reactionrole add/post/remove/list` | Pannelli reaction role |
| `/hobbies` | Pannello self-role hobby (10 preset) |
| `/autothread enable/disable/list` | Auto-thread nei canali |
| `/config view/levelup/welcome/announcements` | Configurazione bot |
| `/setup run/status` | Configurazione server |
| `/guida` | Gestione guide |
| `/gametest` | Test funzionalità giochi |
| `/giveaway create/end/list` | Gestione giveaway |
| `/feedback setup/stats/list/close` | Sistema segnalazioni admin (modal form + workflow) |
| `/gamenight` | Game night ricorrenti |
| `/tempvc setup/disable/status` | Canali vocali temporanei |
| `/cmd add/remove/list` | Comandi personalizzati (!nome) |
| `/schedule add/remove/list/toggle` | Messaggi programmati (cron) |
| `/xpevent start/stop/status` | Eventi XP moltiplicatore |

## Struttura

```
src/
├── commands/          # Slash commands (auto-loaded, 65)
│   ├── admin/         # /game, /giveaway, /tempvc, /cmd, /schedule, /config, /hobbies, /autothread, ecc.
│   ├── mod/           # /warn, /mute, /purge, /userinfo, /slowmode, /lockdown, ecc.
│   └── *.js           # /rank, /mystats, /poll, /lfg, /bp, /loot, /music, ecc.
├── events/            # Discord event listeners (13)
├── handlers/          # Command/event loaders
├── services/          # 51 servizi (cron, API, business logic, engagement)
│   ├── api/           # Steam, Battle.net, Riot
│   └── *Scheduler.js  # Cron jobs
├── ui/                # Interactive UI components
├── utils/             # Helpers (embed, format, permissions, discordFetch, ecc.)
├── modules/games/     # Per-game meta fetchers
├── db/                # Sequelize models (46) + migrations
└── server/            # Health check + Dashboard API (69 route)
dashboard/             # Next.js 14 frontend (30 pagine)
.github/workflows/     # CI/CD (ci.yml + deploy.yml)
deploy/                # Dockerfile + docker-compose
```

## Servizi Cron

| Servizio | Frequenza | Scopo |
|----------|-----------|-------|
| ActivityTracker | 60s | Traccia tempo vocale |
| LeaderboardScheduler | 5min | Cache classifiche |
| MetaScheduler | 6h | Fetch patch notes |
| CleanupScheduler | 24h (4AM) | Pulisci activity_log >30gg |
| StatRefreshScheduler | 24h (5AM) | Auto-refresh stat API |
| NewsPoster | 1h | Pubblica news giochi |
| GuidePoster | 30min | Aggiorna guide canali |
| RaidScheduler | configurabile | Promemoria raid |
| MemberCounterService | 5min | Contatore membri voice channel |
| GiveawayService | 30s | Auto-end giveaway scaduti |
| ScheduledMessageService | cron | Messaggi programmati |
| AlertService | 60s | Monitoraggio memory/errori |
| MilestoneService | 5min | Announce milestone membri (50, 100, 150...) |
| WeeklyStatsService | Sunday 6PM | Statistiche settimanali automatiche |
| GuildChallengeService | 10min | Challenge community (1000 msg, 10h vocale, ecc.) |
| BackupScheduler | Daily 4AM | Backup DB gzip con retention 30gg |
| AntiRaidService | Real-time | Anti-raid per-guild |

## Dashboard Web

Dashboard admin su **Next.js 14** con 30 pagine:
- Overview, Analytics, Audit Log, Automod, Badges
- Discord Logs, Events, Games, Leaderboard, Level Rewards
- Members, Moderation, Raid, Settings, Health, Search
- Scheduled Messages, Custom Commands, Giveaways, Starboard
- XP Events, Birthdays, Tags, **Feedback** (segnalazioni admin)

**Auth**: Discord OAuth2 (JWT)
**Security**: Helmet, rate limiting (per-endpoint), input validation
**Features**: Search bar (Ctrl+K), dark mode, error boundaries

## Sistema Feedback Admin

Sistema strutturato per segnalazioni admin con workflow automatizzato:

```
Admin clicca "Apri Segnalazione" → Modal form (titolo, categoria, priorità, descrizione)
         ↓
Bot crea ticket + thread di discussione
         ↓
Owner clicca "Approva Fix" → ticket in pending-fixes.json
         ↓
Devin legge il file → fixa il codice → marks completed
         ↓
Bot watcher (30s) → aggiorna Discord → notifica admin nel thread
```

**Stati**: 🔴 Aperto → 🟠 Approvato → 🔵 In Lavorazione → 🟢 Risolto / ⚪ Chiuso

**Comando**: `/feedback setup` per creare il canale con il bottone

## Test

```bash
npm test              # Full pipeline (176 test)
npm run test:smoke    # Smoke tests (86 test)
```

## Backup DB

```bash
npm run backup    # mysqldump → backups/backup_YYYY-MM-DD.sql.gz (mantiene 30gg)
```

## Permessi Server Discord

Il bot gestisce i permessi del server in modo coerente:

| Area | Chi vede | Permessi |
|------|----------|----------|
| **Area Iniziale** | @everyone | View, Send (limitato), Voice |
| **Forum** | Staff (Officer+) | Full access |
| **GILDA** (7 cat.) | Bloods + Staff | Full community perms |
| **COMMUNITY** (4 cat.) | Membro community + Bloods + Nitro + Staff | Full community perms |
| **GAME** (18 cat.) | Ruolo gioco + Bloods + Nitro + Staff | Full community perms |

**Nitro Booster** → +500 XP bonus + messaggio ringraziamento (ruolo gestito da Discord)
**Membro della community** → dato a tutti i nuovi utenti tramite verifica (captcha anti-bot)
**Non Verificato** → vede solo Area Iniziale
**Muted** → deny SendMessages/Connect/Speak ovunque

```bash
# Setup permessi (applica a tutte le 31 categorie)
node src/scripts/setupPermissions.js

# Anteprima senza modifiche
node src/scripts/setupPermissions.js --dry-run
```

## Health Check & Monitoring

Endpoint HTTP sulla porta 3000:
- `GET /health` → status JSON
- `GET /metrics` → Prometheus metrics
- `GET /alerts/stats` → alert monitoring stats

Alert automatici su Discord (configurare `ALERT_WEBHOOK_URL` o `ALERT_CHANNEL_ID` in `.env`):
- Memory > 400MB
- Uncaught exceptions
- Unhandled promise rejections
- Bot disconnesso

## CI/CD

- **`.github/workflows/ci.yml`**: test + build dashboard su push/PR
- **`.github/workflows/deploy.yml`**: auto-deploy via SSH su push main

## DB Migrations

```bash
npx sequelize-cli migration:run    # Esegui migrations pendenti
npx sequelize-cli migration:undo   # Rollback ultima migration
```

## Production Checklist

- [x] 38 comandi slash registrati
- [x] 128 test passing
- [x] 0 bug critici/alti
- [x] 0 N+1 query
- [x] Tutti i fetch Discord con cache-first
- [x] Paginazione sicura su tutte le route API
- [x] Input validation middleware
- [x] JWT auth + Helmet + rate limiting
- [x] Alert monitoring attivo
- [x] Graceful shutdown (14 servizi)
- [x] Backup DB automatico
- [x] Docker + CI/CD
- [x] ecosystem.config.js PM2
