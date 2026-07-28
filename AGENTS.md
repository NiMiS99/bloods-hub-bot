# AGENTS.md — Convenzioni di codice per Bloods Hub Bot

## Stack
- Node.js + discord.js v14
- Sequelize ORM + MySQL
- PM2 process manager (usa `ecosystem.config.js`)
- Express 4.x per dashboard API (porta 4567, `DASHBOARD_PORT`)
- Next.js 14 + Tailwind CSS per dashboard frontend (static export in `dashboard/out`)
- Helmet + express-rate-limit per security
- Winston logging con daily rotate

## Convenzioni

### Localizzazione
- **Tutto il testo user-facing è in italiano.**
- Embed titoli: "Errore", "Operazione completata" (non "Error"/"Success").
- Messaggi di errore in italiano.

### Struttura comandi
- Ogni comando in un file separato in `src/commands/`.
- Sottocartelle: `admin/`, `mod/`.
- Ogni comando esporta `{ data, execute }`.
- `data` è uno `SlashCommandBuilder`.
- `execute(interaction, client)` è la funzione principale.

### Permessi
- Usa `isAdmin(member)` da `src/utils/permissions.js` per comandi admin.
- Usa `canModerate(member, [perms])` per comandi moderazione.
- Il ruolo "Bloods Admin" (ID in `ADMIN_ROLE_ID`) bypassa i controlli.

### Embed
- Usa `baseEmbed()`, `successEmbed()`, `errorEmbed()` da `src/utils/embed.js`.
- Colore brand: `0x8b0000` (dark red).
- Non creare EmbedBuilder direttamente se non necessario.

### Fraktur
- Nomi canali/categorie usano `toFraktur()` da `src/utils/textFormatter.js`.
- Non applicare Fraktur a mention, ID, o URL.

### DB
- Modelli in `src/db/models/`, registrati in `src/db/index.js`.
- `underscored: true` per snake_case colonne.
- `timestamps: true` con `created_at`/`updated_at`.
- Non usare `sync({ alter: true })` in produzione.

### Logging
- Usa `logger.info/warn/error` da `src/utils/logger.js`.
- Non usare `console.log` in produzione.

### Audit log
- Comandi admin devono chiamare `recordAudit()` da `src/utils/auditLog.js`.

### Require
- Tutti i `require()` in cima al file, non dentro funzioni.

### Test
- Esegui `node tests/smoke.test.js` prima di deployare.
- Aggiungi test per nuove funzioni in `tests/smoke.test.js`.

### Deploy
1. `node src/scripts/deploy-commands.js` per registrare nuovi comandi.
2. `pm2 restart bloods-hub-bot` per riavviare.
3. Verifica con `node tests/smoke.test.js`.

### Dashboard
- Backend: `src/server/dashboardServer.js` + route in `src/server/routes/`
- Frontend: `dashboard/` (Next.js con `output: 'export'`)
- Build frontend: `cd dashboard && npm run build` (output in `dashboard/out/`)
- API: `http://SERVER_IP:3001/api/`
- Frontend: `http://SERVER_IP:3001/`
- Auth: Discord OAuth2 (richiede `DISCORD_CLIENT_SECRET` in `.env`)
- Ogni azione admin dalla dashboard viene registrata in `audit_log` con prefix `dashboard.*`
- Middleware auth: `requireAuth` (JWT), `requireGuildMember` (membro server), `requireAdmin` (permessi admin/mod)

### Template canali gioco
- Usa `createGameChannels()` da `src/utils/gameChannels.js`.
- Template: generale, news, comunicazioni, composizioni, Vocale 1, Vocale 2.
- Non creare canali manualmente — usa sempre il template.

### Onboarding
- Nuovi utenti ricevono ruolo "Non Verificato" (vedono solo #Benvenuto + #Regolamento).
- Cliccando "Verifica" in #Benvenuto → ricevono "Membro della community" → sblocco server.
- Servizio: `src/services/onboardingService.js`.
- Event: `guildMemberAdd` assegna "Non Verificato" automaticamente.

### Ticket system
- Pannello in #ticket-assistenza con bottone "Apri Ticket".
- Crea canale privato `ticket-username` visibile solo a utente + staff.
- Bottone "Chiudi Ticket" elimina il canale dopo 5 secondi.
- Servizio: `src/services/ticketService.js`.

### Logging avanzato
- Canale `#log-staff` (visibile solo a staff) registra:
  - Nuovi membri / membri usciti
  - Modifiche ruoli / nickname
  - Messaggi eliminati / modificati
  - Attività vocale (join/leave/move)
- Servizio: `src/services/advancedLogger.js`.
- Event: `guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`, `messageDelete`, `messageUpdate`, `voiceStateUpdate`.

### Auto-ruoli XP
- Livello 10 → "Giocatore Attivo"
- Livello 50 → "Veterano"
- Livello 100 → "Leggenda"
- Servizio: `src/services/autoRoleService.js` (chiamato da `xpService.js`).

### Visibilità canali giochi
- Categorie giochi (Apex, CS2, Dota, LoL, Minecraft, FFXIV, Valorant, WoW) nascoste a @everyone.
- Visibili solo con il ruolo del gioco corrispondente.
- Script: `src/scripts/setupGameChannelVisibility.js` (eseguire dopo creazione nuove categorie).
- Staff (Bloods, Admin, Officer, ecc.) vede tutte le categorie.

### Sistema raid (DKP / Progress)
- Comandi: `/bp`, `/loot`, `/spedizione`, `/raidreq`, `/raidstatus`.
- Modelli DB: `BpUser`, `BpLootHistory`, `BpActiveRoll`, `BpRaidRoster`, `BpItem`, `WowEvent`, `WowEventSignup`, `RaidConfig`, `RaidEligibility`, `RaidAttendance`.
- Servizi: `raidEligibilityChecker.js` (verifica Blizzard API), `raidScheduler.js` (auto-promemoria).
- Blizzard API: `src/services/api/battleNetApi.js` (richiede `BATTLE_NET_CLIENT_ID` + `BATTLE_NET_CLIENT_SECRET` in `.env`).
- Formato link WoW: `/link battlenet NomePersonaggio-Reame` (es: `Bäba-Pozzo dellEternità`).
- Ruolo "Progress" assegnato/rimosso automaticamente in base ai requisiti.

### Giveaway system
- Comandi: `/giveaway create/end/list`.
- Modello DB: `Giveaway`.
- Servizio: `giveawayService.js` (scheduler auto-end ogni 30s).
- Partecipanti tracciati in memoria (Map), non su DB.
- Bottoni interattivi: `giveaway:join` in `interactionCreate.js`.

### Canali vocali temporanei
- Comandi: `/tempvc setup/disable/status`.
- Colonna DB: `guilds.temp_voice_creator_channel_id`.
- Servizio: `tempVoiceService.js` (integrazione in `voiceStateUpdate.js`).
- Utente join canale creatore → crea canale privato → eliminato quando vuoto.
- Controlli owner: rename, lock/unlock, limit, delete (modal + button).

### Comandi personalizzati
- Comandi: `/cmd add/remove/list`.
- Modello DB: `CustomCommand`.
- Attivati con prefisso `!` in `messageCreate.js`.
- Supporta embed con titolo, colore, immagine.

### Messaggi programmati
- Comandi: `/schedule add/remove/list/toggle`.
- Modello DB: `ScheduledMessage`.
- Servizio: `scheduledMessageService.js` (cron-based, node-cron).
- Validazione cron con `isValidCron()` da `middleware/validate.js`.

### Alert monitoring
- Servizio: `alertService.js` (init in `index.js`).
- Monitora: memory >400MB, uncaught exceptions, unhandled rejections.
- Alert via webhook Discord (`ALERT_WEBHOOK_URL`) o canale (`ALERT_CHANNEL_ID`).
- Endpoint: `GET /alerts/stats` su health server.
- Cooldown 5min per stesso tipo di alert.

### Discord fetch helpers
- Usa `fetchMember()`, `fetchMembersBatch()`, `fetchChannel()` da `src/utils/discordFetch.js`.
- Tutti i fetch usano `{ force: false }` (cache-first).
- Per batch fetch multipli, usa `fetchMembersBatch()` con Map.

### Input validation
- Middleware: `src/server/middleware/validate.js`.
- `validatePagination`: page max 1000, limit max 100.
- `isValidDiscordId()`: regex `^\d{17,20}$`.
- `isValidCron()`: validazione base 5-6 campi.
- Tutte le route API usano `Math.min(Math.max(parseInt() || default, min), max)`.

### DB migrations
- Config: `.sequelizerc` + `config/database.js`.
- Migrations in `src/db/migrations/`.
- Esegui: `npx sequelize-cli migration:run`.
- Non usare `sync({ alter: true })` in produzione.

### CI/CD
- `.github/workflows/ci.yml`: test + build dashboard su push/PR.
- `.github/workflows/deploy.yml`: auto-deploy via SSH su push main.
- Richiede secrets: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `KNOWN_HOSTS`.
