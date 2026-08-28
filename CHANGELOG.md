# Changelog — Bloods Hub Bot

Tutti i cambiamenti notevoli di questo progetto sono documentati in questo file.
Formato basato su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).

## [Unreleased]

### Aggiunto
- `AGENTS.md` — istruzioni per AI agent che lavorano sul progetto
- `docs/GUIDE_GIOCATORI.md` — guida per membri della gilda
- `docs/GUIDE_OFFICER.md` — guida per officer, raid leader e staff
- `docs/GUILD_OF_WOW.md` — guida integrazione Guilds of WoW
- `CONTRIBUTING.md` — linee guida per contributor
- `CHANGELOG.md` — questo file
- `.nvmrc` — versione Node.js richiesta (20)
- `.editorconfig` — standard formattazione editor
- Config WCL (Warcraft Logs) in `src/config/index.js`

### Cambiato
- `docs/DEV_GUIDE.md` — riscritto con struttura attuale (71 comandi, 40 modelli, 50+ servizi)
- `docs/ADMIN_GUIDE.md` — aggiornato con ruoli gilda v3.0, dashboard admin, troubleshooting
- `README.md` — aggiunta sezione documentazione con 7 file
- `.github/workflows/ci.yml` — fix node-version (26→20, LTS attuale)
- `.gitignore` — aggiunti file temporanei e backup
- `package.json` — description e keywords aggiornati
- `scripts/legacy/README.md` — dettagliato con lista script e avvertenze

### Sicurezza
- Fix permesso Discord: `#modifiche-da-apportare` non più visibile al ruolo `Bloods`
- CORS environment-aware (solo `bloodswow.it` in produzione)
- Docker log rotation (10MB max, 3 file)
- Music service: graceful error handling per servizi non disponibili

### Rimosso
- `scripts/_audit_out.txt` — file temporaneo obsoleto
- `scripts/_empty_out.txt` — file temporaneo obsoleto
- `scripts/_roles_out.txt` — file temporaneo obsoleto
- `scripts/_verify.txt` — file temporaneo obsoleto
- `scripts/_verify2.txt` — file temporaneo obsoleto
- `discord_audit.txt` — file temporaneo obsoleto

## [1.0.0] — 2025-09-20

### Aggiunto
- Bot Discord con 71 comandi slash (42 pubblici + 20 admin + 9 mod)
- Dashboard web Next.js 14 con 7 pagine pubbliche + 30+ admin
- API REST Express con 98 endpoint
- Database MySQL con 40 modelli Sequelize
- Sistema XP con curva quadratica
- Bloods Points (BP) per loot raid
- Raid eligibility, attendance, roster management
- Automod (filtro parole, anti-spam, anti-raid)
- Music service (@discordjs/voice + play-dl)
- PWA (manifest, service worker, icone)
- SEO (sitemap, robots.txt, JSON-LD, Open Graph)
- Test: 293 assertions (pipeline + unit + API + E2E)
- CI/CD GitHub Actions
- Docker + docker-compose
- PM2 ecosystem config
- Nginx reverse proxy con SSL
