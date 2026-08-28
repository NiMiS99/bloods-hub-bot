# AGENTS.md — Bloods Hub Bot

> Istruzioni per AI agent (Cascade, Copilot, ecc.) che lavorano su questo progetto.

## Contesto

Bloods Hub Bot è un bot Discord multi-gioco per la gilda italiana "Bloods" su World of Warcraft (Pozzo dell'Eternità, Orda, EU). Il progetto include:
- **Bot Discord** (Node.js, discord.js v14) con 71 comandi slash
- **Dashboard web** (Next.js 14 static export, Tailwind CSS, PWA)
- **API REST** (Express) con JWT auth, rate limiting, helmet, CORS
- **Database** (MySQL 8 + Sequelize ORM)
- **Deploy** (PM2 su Windows Server, Nginx reverse proxy, SSL Let's Encrypt)

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 18+ (CommonJS) |
| Bot | discord.js v14 |
| Web | Next.js 14 (static export) + Tailwind CSS |
| API | Express 4 + helmet + cors + express-rate-limit |
| DB | MySQL 8 + Sequelize 6 |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| Test | Jest + supertest + Playwright |

## Struttura progetto

```
bloods-hub-bot/
├── src/
│   ├── index.js              # Entry point: avvia bot + dashboard
│   ├── config/index.js       # Loader variabili d'ambiente
│   ├── commands/             # 71 comandi slash (auto-load ricorsivo)
│   │   ├── admin/            # 20 comandi admin (setup, game, giveaway, ...)
│   │   ├── mod/              # 9 comandi moderazione (mute, warn, purge, ...)
│   │   └── *.js              # 42 comandi pubblici (bp, raid, lfg, music, ...)
│   ├── events/               # 12 event handler (auto-load)
│   ├── handlers/             # Command + event handler
│   ├── services/             # 50+ servizi (XP, BP, raid, automod, music, ...)
│   ├── server/               # Express API + middleware + 21 route files
│   ├── db/                   # Sequelize + 40 modelli + 4 migrazioni
│   ├── modules/games/        # 9 game meta fetcher (wow, lol, valorant, ...)
│   ├── ui/                   # Interazioni UI (role selection, event, LFG)
│   └── utils/                # Logger, embed, format, permissions, audit
├── dashboard/                # Next.js 14 frontend
│   └── src/app/              # 7 pagine pubbliche + 30+ pagine admin
├── tests/                    # 5 suite test (293 assertions totali)
├── scripts/                  # Script utility (audit, backup, migrate)
├── docs/                     # Documentazione (DEV, ADMIN, DEPLOYMENT, GUIDE)
├── Dockerfile                # Container build
├── docker-compose.yml        # Bot + MySQL orchestration
├── ecosystem.config.js       # PM2 config
└── .env.example              # Template variabili d'ambiente
```

## Convenzioni

- **CommonJS** ovunque (`require`/`module.exports`)
- Comandi slash: `module.exports = { data: SlashCommandBuilder, execute }`
- Event handler: `module.exports = { name, once?, execute }`
- Auto-discovery: comandi in `src/commands/**/`, eventi in `src/events/`
- Modelli DB in `src/db/models/`, uno per tabella
- Embed con helper `src/utils/embed.js` per branding coerente
- Logger: Winston (`src/utils/logger.js`), log giornalieri rotanti in `logs/`

## Sicurezza

- **JWT**: cookie httpOnly + secure + sameSite=lax, scadenza 7 giorni
- **CORS**: environment-aware (solo `bloodswow.it` in produzione)
- **Rate limiting**: 100 req/15min API, 5 req/15min auth, 60 req/15min pubbliche
- **Helmet**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Body sanitizer**: strip HTML tags + max 5000 char (anti-XSS)
- **Auth middleware**: `requireAuth` → `requireGuildMember` → `requireAdmin`
- **Audit log**: ogni azione admin registrata nel DB
- **Route admin**: tutte protette con `requireAuth + requireGuildMember + requireAdmin`
- **Route pubbliche**: solo `public.js` senza auth (read-only, cached 60s)

## Test

```bash
npm run test:all    # 293 assertions: pipeline + unit + API + E2E
npm run test:unit   # 37 assertions: XP, BP, RaidService
npm run test:api    # 16 assertions: API integration
npm run test:e2e    # 23 assertions: E2E smoke
```

## Deploy

```bash
npm run dashboard:build    # Build Next.js static export
pm2 restart bloods-hub-bot --update-env
pm2 save
```

## File da NON modificare

- `.env` — contiene secret reali, gitignored
- `package-lock.json` — generato da npm
- `dashboard/out/` — output di build, rigenerabile
- `node_modules/` — dipendenze
- `logs/` — log runtime
- `backups/` — backup DB
- `scripts/legacy/` — script one-shot già eseguiti, riferimento storico

## Integrazioni WoW

Il progetto si integra con diverse piattaforme WoW:
- **Battle.net API** — roster, personaggi, ilvl, M+ (già implementato in `src/services/api/battleNetApi.js`)
- **Warcraft Logs** — combat log, parse, progressione raid (config in `src/config/index.js`)
- **Guilds of WoW** — piattaforma gilda con API roster/reclutamento (vedi `docs/GUILD_OF_WOW.md`)
- **Raider.IO** — M+ score, raid progress (futuro)

Per dettagli integrazione: `docs/GUILD_OF_WOW.md`

## Regole per AI agent

1. **Mai committare secret** (token, password, API key)
2. **Mai eliminare test** senza esplicita richiesta
3. **Mai modificare `.env`** — solo `.env.example`
4. **CommonJS** — non introdurre ESM
5. **Tailwind CSS** — non aggiungere CSS framework
6. **Minimal edits** — preferire edit focalizzati, seguire stile esistente
7. **Test dopo modifiche** — `npm run test:all` prima di committare
8. **Lingua** — UI e documentazione in italiano, codice in inglese
