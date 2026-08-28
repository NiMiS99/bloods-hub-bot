# Bloods Hub Bot

Bot Discord multifunzione + sito web per la gilda **Bloods** (World of Warcraft — Pozzo dell'Eternità EU).

## Panoramica

Bloods Hub Bot è un sistema completo che combina:
- **Bot Discord** con 71 comandi slash (43 root + 19 admin + 9 mod) e 53 servizi automatizzati
- **Sito web pubblico** (Next.js) con pagine vetrina, SEO, PWA, service worker
- **Dashboard admin** con 30 pagine di gestione, notification bell, search bar globale
- **API REST** con 98 endpoint (Express + Sequelize/MySQL), rate limiting, input sanitization
- **Sicurezza**: Helmet (HSTS preload), JWT httpOnly, OAuth2 Discord, body sanitizer anti-XSS
- **Testing**: 217 assertion in pipeline test, ESLint

## Stack tecnologico

| Componente | Tecnologia |
|------------|-----------|
| Bot | Node.js, discord.js v14 |
| Backend | Express, Sequelize ORM, MySQL |
| Frontend | Next.js 14 (static export), React, Tailwind CSS |
| Process manager | PM2 |
| Reverse proxy | Nginx con SSL (Let's Encrypt) |
| PWA | manifest.json, service worker, icone PNG |

## Struttura del progetto

```
bloods-hub-bot/
├── src/                      # Codice sorgente bot + backend
│   ├── commands/             # 71 slash commands (43 root + 19 admin + 9 mod)
│   ├── config/               # Configurazione bot
│   ├── data/                 # Dati statici (giorni raid, ruoli)
│   ├── db/                   # Database Sequelize
│   │   ├── models/           # 48 modelli (User, BpUser, RaidConfig, Giveaway, ecc.)
│   │   └── index.js          # Inizializzazione Sequelize + associazioni
│   ├── events/               # Handler eventi Discord (ready, messageCreate, ecc.)
│   ├── handlers/             # Handler modulari (errori, interazioni)
│   ├── modules/              # Moduli bot (leveling, moderation, music, ecc.)
│   ├── scripts/              # Script utility (migrate, seed, backup)
│   ├── server/               # Server Express (dashboard + API)
│   │   ├── middleware/       # Middleware auth, rate limiting
│   │   ├── routes/           # 22 file route API (auth, guilds, public, raid, ecc.)
│   │   └── dashboardServer.js # Server principale Express
│   ├── services/             # 53 servizi (XP, BP/DKP, raid, giveaways, ecc.)
│   ├── ui/                   # Componenti UI Discord (embeds, buttons)
│   └── utils/                # Utility (logger, audit, helpers)
├── dashboard/                # Frontend Next.js
│   ├── src/
│   │   ├── app/              # Pagine (home, raid, classifiche, hall-of-fame, ecc.)
│   │   │   ├── dashboard/    # 30+ sezioni admin
│   │   │   ├── area/         # Area membri privata
│   │   │   ├── login/        # Login OAuth Discord
│   │   │   ├── chi-siamo/    # About us
│   │   │   ├── raid/         # Info raid
│   │   │   ├── classifiche/  # Leaderboard
│   │   │   ├── eventi/       # Eventi community
│   │   │   ├── hall-of-fame/ # Hall of fame
│   │   │   └── unisciti/     # Recruitment
│   │   ├── components/       # Componenti React (Navbar, Footer, DiscordWidget, ApiError, NotificationBell, ecc.)
│   │   └── lib/              # Utility (siteConfig, fetchPublic, utils)
│   ├── public/               # Asset statici (logo, icone PWA, manifest, sw, sitemap)
│   └── next.config.js        # Config Next.js (static export)
├── config/                   # Configurazione di produzione
├── deploy/                   # Script di deployment
├── docs/                     # Documentazione
├── logs/                     # Log applicazione
├── nginx/                    # Configurazione Nginx
├── scripts/                  # Script utility
├── tests/                    # Test
├── .env                      # Variabili ambiente (gitignored)
├── package.json              # Dipendenze e script
└── ecosystem.config.js       # Config PM2
```

## Setup

### Prerequisiti
- Node.js >= 18
- MySQL 8
- PM2 (`npm i -g pm2`)
- Nginx (reverse proxy)

### Installazione
```bash
# 1. Clona il repo
git clone <repo-url> bloods-hub-bot
cd bloods-hub-bot

# 2. Installa dipendenze
npm install
cd dashboard && npm install && cd ..

# 3. Configura .env (copia da .env.example e compila)
cp .env.example .env
# Edita .env con i tuoi valori

# 4. Inizializza database
npm run db:migrate

# 5. Build dashboard
npm run dashboard:build

# 6. Avvia con PM2
pm2 start ecosystem.config.js
pm2 save
```

### Variabili ambiente (.env)

| Variabile | Descrizione |
|-----------|-------------|
| `DISCORD_TOKEN` | Token bot Discord |
| `DISCORD_CLIENT_ID` | Client ID applicazione Discord |
| `DISCORD_CLIENT_SECRET` | Client secret OAuth2 Discord |
| `GUILD_ID` | ID server Discord principale |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credenziali MySQL |
| `DASHBOARD_PORT` | Porta server Express (default 4567) |
| `DASHBOARD_URL` | URL pubblico sito (https://bloodswow.it) |
| `DASHBOARD_SECURE` | `true` per cookie HTTPS |
| `JWT_SECRET` | Secret per JWT auth |
| `BATTLE_NET_CLIENT_ID` / `SECRET` | API Blizzard |
| `WCL_CLIENT_ID` / `SECRET` | API Warcraft Logs (opzionale) |

## API pubbliche

Base URL: `https://bloodswow.it/api/public`

| Endpoint | Descrizione |
|----------|-------------|
| `GET /info` | Info gilda + statistiche community |
| `GET /leaderboard?metric=xp\|messages\|voice` | Classifica membri |
| `GET /bp/leaderboard` | Classifica BP/DKP |
| `GET /bp/loot` | Ultimi loot BP |
| `GET /bp/loot/full?limit=50&boss=` | Galleria loot completa con filtri |
| `GET /raid` | Configurazione raid + roster |
| `GET /raid/progress` | Progressione boss kill |
| `GET /hall-of-fame` | Top BP, attendance, looter |
| `GET /events` | Eventi community attivi |
| `GET /giveaways` | Giveaway attivi |
| `GET /tournaments` | Tornei attivi |
| `GET /discord-widget` | Membri online + canali vocali live |
| `GET /docs` | Documentazione API pubblica |

## Sicurezza

- **Helmet**: HSTS preload, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin
- **JWT**: cookie httpOnly + secure + sameSite=lax, scadenza 7 giorni
- **OAuth2 Discord**: flow completo con state validation
- **CORS**: whitelist environment-aware (solo `bloodswow.it` in produzione, `localhost` in sviluppo)
- **Rate limiting**: 100 req/15min API generali, 5 req/15min endpoint auth, 60 req/15min API pubbliche
- **Body sanitizer**: strip HTML tags + max length 5000 char su tutti i POST/PUT (anti-XSS)
- **Input validation**: middleware `requireBodyFields`, `validateString`, `isValidDiscordId`, `isValidCron`
- **Audit log**: ogni azione amministrativa registrata nel DB
- **Music service**: graceful error handling con fallback message per servizi non disponibili

## Pagine sito web

| URL | Descrizione |
|-----|-------------|
| `/` | Homepage con hero, stats, eventi, top players |
| `/raid/` | Orari raid, requisiti, roster, loot recenti |
| `/classifiche/` | Classifiche XP, messaggi, vocali, BP |
| `/eventi/` | Eventi community in programma |
| `/hall-of-fame/` | Progressione raid, top BP, attendance, loot |
| `/chi-siamo/` | Storia gilda, valori, strumenti |
| `/unisciti/` | Reclutamento: ruoli, passi per entrare |
| `/login/` | Login OAuth Discord |
| `/area/` | Area membri privata (richiede auth) |
| `/dashboard/` | Dashboard admin (richiede auth + permessi) |

## Comandi bot (71 totali)

### Giochi & Community (13)
- `/mygames`, `/mystats`, `/rank`, `/rankcard`, `/leaderboard`, `/stats`, `/serverstats`, `/serverinfo`, `/members`, `/gamemeta`, `/gameroles`, `/music`, `/ping`

### Eventi & LFG (7)
- `/event create/list/info`, `/lfg`, `/lfg list`, `/poll`, `/suggest`

### Account esterni (2)
- `/link`, `/refreshstats`

### Community features (8)
- `/remind`, `/remind list`, `/birthday set/list`, `/starboard`, `/reactionrole`, `/hobbies`, `/autothread`

### Moderazione (9)
- `/userinfo`, `/purge`, `/warn`, `/clearwarn`, `/warnings`, `/mute`, `/unmute`, `/slowmode`, `/lockdown`

### Admin (19)
- `/setup`, `/game add/list/remove/update`, `/rolepanel`, `/gamemode`, `/giveaway`, `/tempvc`, `/cmd`, `/schedule`, `/xpevent`, `/config`, `/feedback`, `/guida`, `/onboarding`, `/restore`, `/gamenight`, `/gametest`, `/xpevent`

### Utility (3)
- `/ping`, `/help`, `/dashboard`

## Deployment

```bash
# Build dashboard
npm run dashboard:build

# Restart bot
pm2 restart bloods-hub-bot --update-env

# Reload Nginx
nginx -s reload

# Salva stato PM2
pm2 save
```

## SEO & Indicizzazione

- **Google Search Console**: verificato (meta tag in layout.js)
- **Sitemap**: `https://bloodswow.it/sitemap.xml` (generato dinamicamente in build)
- **robots.txt**: `https://bloodswow.it/robots.txt` (Allow /, Disallow /dashboard /area /login /api)
- **JSON-LD**: Organization, WebSite, BreadcrumbList
- **Open Graph**: immagine 1200x630, titolo, descrizione
- **PWA**: manifest.json, service worker v3 (cache-first), icone 192/512px
- **HSTS preload**: abilitato
- **Gzip**: compression middleware su tutte le risposte

## Testing

```bash
# Pipeline test (217 assertion)
npm test

# Unit test (37 assertion — XP, BP, helpers)
npm run test:unit

# API integration test (16 assertion)
npm run test:api

# E2E smoke test (23 assertion — live site)
npm run test:e2e

# All tests (293 assertion total)
npm run test:all

# Smoke test
npm run test:smoke

# Lint
npm run lint
```

Il pipeline test verifica:
- Caricamento di tutti i 71 comandi (data + execute)
- Caricamento di tutti i 48 modelli DB
- Esportazione corretta di tutti i 53 servizi
- Validazione middleware (pagination, Discord ID, cron)
- Helper Discord fetch (null safety)
- Servizi critici (AlertService, ChallengeService, ReputationService, ecc.)

L'unit test verifica:
- XP: `xpForLevel` (curva quadratica), `xpToNextLevel` (progressione)
- XP: costanti `MSG_XP`, `VOICE_XP_PER_MIN`, `ROLE_BONUS_XP`
- XP Event: `getMultiplier` (stato iniziale = 1)
- BP: `computeScore` (roll × (1 + bid/50))
- BP: `randInt` (range validation, edge cases)
- BP: `extractUserIdsFromMentions` (parsing, dedup, edge cases)
- BP: `isRaidLeader` (admin, role check, null safety)

L'API integration test verifica:
- Routing corretto di tutti i 13 endpoint pubblici (no 404)
- Response 200 per endpoint statici (/docs, /discord-widget)
- Struttura JSON corretta (endpoints array, online number, voiceChannels array)
- 404 per endpoint sconosciuti
- Content-Type application/json

L'E2E smoke test verifica (su sito live):
- Homepage: 200, contiene nome gilda, Open Graph, JSON-LD
- 6 pagine pubbliche: 200
- Redirect auth: /dashboard/ e /area/ → /login/
- API: /info, /leaderboard, /discord-widget, /docs (struttura + status)
- SEO: sitemap.xml, robots.txt, manifest.json
- Security: HSTS preload, X-Frame-Options, X-Content-Type-Options
- 404 per pagina sconosciuta
- Gzip compression attiva

### CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Lint con ESLint
- Smoke test
- Pipeline test (217 assertion)
- Unit test (37 assertion)
- API integration test (16 assertion)
- E2E smoke test (23 assertion, solo su push)
- Build dashboard Next.js

## Docker

Deploy riproducibile con Docker:

```bash
# Build e avvio
docker compose up -d

# Solo bot (DB esterno)
docker build -t bloods-hub-bot .
docker run -d --env-file .env -p 4567:4567 bloods-hub-bot
```

Il `docker-compose.yml` include:
- Bot + dashboard (build da Dockerfile)
- MySQL 8 con volume persistente
- Healthcheck automatico (endpoint /api/public/info)
- Restart unless-stopped
- Log rotation (10MB max, 3 file)

### Indicizzazione gratuita
1. **Google**: https://search.google.com/search-console → aggiungi `bloodswow.it` → invia sitemap
2. **Bing**: https://www.bing.com/webmasters → aggiungi sito → invia sitemap
3. **DuckDuckGo**: indicizza automaticamente da Bing

## Documentazione

| File | Audience | Contenuto |
|------|----------|-----------|
| `AGENTS.md` | AI agent | Istruzioni per AI che lavorano sul progetto |
| `CONTRIBUTING.md` | Contributor | Linee guida per contribuire al progetto |
| `CHANGELOG.md` | Tutti | Storico versioni e cambiamenti |
| `docs/DEV_GUIDE.md` | Sviluppatori | Struttura, convenzioni, API, DB, test, deploy |
| `docs/ADMIN_GUIDE.md` | Staff Discord | Setup, gestione giochi, permessi, troubleshooting |
| `docs/GUIDE_OFFICER.md` | Officer/RL | Colloqui, raid, BP, moderazione, dashboard admin |
| `docs/GUIDE_GIOCATORI.md` | Membri gilda | Comandi, XP, BP, progressione, regole |
| `docs/GUILD_OF_WOW.md` | Officer/Dev | Integrazione Guilds of WoW, Battle.net, WCL, Raider.IO |
| `docs/DEPLOYMENT.md` | DevOps | Nginx, PM2, SSL, SEO, backup |

## Licenza

Proprietario — © Bloods Guild. Tutti i diritti riservati.

## Contatti

- **Sito**: https://bloodswow.it
- **Discord**: https://discord.gg/DrGMeEMxF6
- **Email**: info@bloodswow.it
