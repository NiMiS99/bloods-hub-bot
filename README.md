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

## Comandi (38)

### Utente (21)
| Comando | Descrizione |
|---------|-------------|
| `/ping` | Verifica latenza bot |
| `/help` | Lista tutti i comandi |
| `/mystats [user]` | Profilo community (XP, badge, stat, link) |
| `/mygames` | I tuoi giochi + statistiche |
| `/rank [user]` | Livello, XP, badge, posizione classifica |
| `/stats` | Statistiche community |
| `/serverinfo` | Info server Discord |
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

### Moderazione (7)
| Comando | Descrizione |
|---------|-------------|
| `/userinfo <user>` | Info dettagliate membro |
| `/purge <n> [user]` | Bulk delete messaggi |
| `/warn <user> <motivo> [severita]` | Assegna warning + ruolo + escalation |
| `/clearwarn <user>` | Rimuovi tutti i warning + ruolo |
| `/warnings <user>` | Storico warning |
| `/mute <user> <durata> [motivo]` | Timeout membro |
| `/unmute <user>` | Rimuovi timeout |

### Admin (10)
| Comando | Descrizione |
|---------|-------------|
| `/game add/list/remove/update` | Gestione catalogo giochi |
| `/gamemode add/edit/remove/list/post` | Gestione server privati community |
| `/rolepanel` | Pannello selezione giochi |
| `/setup run/status` | Configurazione server |
| `/guida` | Gestione guide |
| `/gametest` | Test funzionalità giochi |
| `/giveaway create/end/list` | Gestione giveaway |
| `/tempvc setup/disable/status` | Canali vocali temporanei |
| `/cmd add/remove/list` | Comandi personalizzati (!nome) |
| `/schedule add/remove/list/toggle` | Messaggi programmati (cron) |

## Struttura

```
src/
├── commands/          # Slash commands (auto-loaded, 38)
│   ├── admin/         # /game, /giveaway, /tempvc, /cmd, /schedule, ecc.
│   ├── mod/           # /warn, /mute, /purge, /userinfo, ecc.
│   └── *.js           # /rank, /mystats, /poll, /lfg, /bp, /loot, ecc.
├── events/            # Discord event listeners (11)
├── handlers/          # Command/event loaders
├── services/          # 32 servizi (cron, API, business logic)
│   ├── api/           # Steam, Battle.net, Riot
│   └── *Scheduler.js  # Cron jobs
├── ui/                # Interactive UI components
├── utils/             # Helpers (embed, format, permissions, discordFetch, ecc.)
├── modules/games/     # Per-game meta fetchers
├── db/                # Sequelize models (33) + migrations
└── server/            # Health check + Dashboard API (15 route)
dashboard/             # Next.js 14 frontend (15 pagine)
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

## Dashboard Web

Dashboard admin su **Next.js 14** con 15 pagine:
- Overview, Analytics, Audit Log, Automod, Badges
- Discord Logs, Events, Games, Leaderboard, Level Rewards
- Members, Moderation, Raid, Settings

**Auth**: Discord OAuth2 (JWT)
**Security**: Helmet, rate limiting, input validation

## Test

```bash
npm test              # Full pipeline (128 test)
npm run test:smoke    # Smoke tests (59 test)
```

## Backup DB

```bash
npm run backup    # mysqldump → backups/backup_YYYY-MM-DD.sql (mantiene 7)
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
