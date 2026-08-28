# Manuale Bot Bloods Hub — Documentazione Operativa

> Il bot Discord **Bloods Hub Bot** è il cuore operativo della community. Gestisce onboarding, raid, loot (BP), leveling, ticket, eventi, moderazione, dashboard web e integrazione WoW.
> Sostituisce tutti i bot esterni (Ticket Tool, Raid-Helper, MEE6, Apollo, ecc.) con un sistema unificato e custom.
> Codice: `C:\Users\diego\Desktop\bloods-hub-bot` — Stack: Node.js + discord.js v14 + Sequelize/MySQL + PM2.

---

## 1. Onboarding (flow reale)

### Step-by-step quando un utente entra nel server
1. **Utente entra** → bot assegna automaticamente ruolo `Non Verificato`
2. `Non Verificato` vede solo: `#Benvenuto` + `#Regolamento` (read-only)
3. Utente clicca bottone **"Verifica"** in `#Benvenuto`
4. Bot invia **CAPTCHA** (anti-bot)
5. CAPTCHA superato → bot rimuove `Non Verificato`, assegna `Membro della community`
6. Bot invia **DM di benvenuto** con lista comandi e canali importanti
7. Bot post messaggio di benvenuto in `#generale`
8. Utente può ora selezionare giochi in `#selezione-giochi` (pannello reaction role)

### Ruoli chiave onboarding
| Ruolo | Chi lo ha | Cosa vede |
|-------|-----------|----------|
| `Non Verificato` | Nuovi utenti prima della verifica | Solo #Benvenuto + #Regolamento |
| `Membro della community` | Utenti verificati | Area Community + giochi selezionati |
| `Bloods` | Membri gilda WoW | Area Gilda + Community + tutti i giochi |

> **Nota importante:** il ruolo `Bloods` viene assegnato manualmente dagli Officer dopo il colloquio, NON automaticamente. Il flow bot copre solo la verifica anti-bot → `Membro della community`. Il passaggio a `Bloods` è manuale.

---

## 2. Comandi utente (27)

### Profilo e statistiche
| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/help` | Lista tutti i comandi per categoria | — |
| `/mystats [user]` | Profilo community (XP, badge, stat, link) | opzionale: @user |
| `/mygames` | I tuoi giochi + statistiche | — |
| `/rank [user]` | Livello, XP, badge, posizione classifica | opzionale: @user |
| `/rankcard [user]` | Genera immagine carta rank | opzionale: @user |
| `/stats` | Statistiche community | — |
| `/serverstats` | Statistiche server con grafici | — |
| `/serverinfo` | Info server Discord | — |
| `/members [ruolo]` | Lista membri per ruolo | opzionale: nome ruolo |
| `/leaderboard [game] [metric] [top]` | Classifiche | game/metric/top opzionali |
| `/changelog` | Ultime modifiche al bot | — |

### Gaming
| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/link <provider> <id> [region]` | Collega account esterno | `steam`, `battlenet NomePG-Reame`, `riot` |
| `/refreshstats [user]` | Aggiorna stat da API esterne | opzionale: @user |
| `/gamemeta <game> [kind]` | Patch notes / meta / server status | autocomplete game |
| `/gameroles [game]` | Mostra ruoli gioco disponibili | opzionale: nome gioco |
| `/lfg` | Cerca compagni di gioco | `create [game] [max_players] [desc]`, `list` |

### WoW / Raid
| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/bp` | Bloods Points (DKP) | vedi sezione BP |
| `/loot` | Loot roll system | vedi sezione BP |
| `/spedizione` | Spedizioni WoW (signup raid) | vedi sezione Raid |
| `/raidreq` | Configura requisiti raid (admin) | — |
| `/raidstatus` | Stato idoneità raid | `me` per il tuo stato |
| `/raidattendance` | Presenze raid → BP automatici (RL+) | `mark [raid_name] [voice_channel] [kills_normal] [kills_heroic] [kills_mythic]`, `stats [user]`, `list [raid_name] [date]` |
| `/keys` | Mythic+ keys gilda + Raider.io | `list` (tutti), `me` (profilo), `leaderboard` (classifica) |

### Community
| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/event` | Eventi community | `create`, `list`, `view [id]`, `delete` (admin) |
| `/poll` | Crea sondaggi | `question`, `options`, `duration` |
| `/suggest` | Proponi suggerimenti | `idea [text]` |
| `/remind` | Promemoria personale | `time [durata] message [testo]` |
| `/birthday` | Compleanni | `set [data]`, `remove`, `view [@user]`, `list` |
| `/tag` | Guide salvate | `list`, `view [nome]` |
| `/music` | Player musicale | `play`, `skip`, `stop`, `queue`, `pause`, `resume` |
| `/daily` | Challenge giornaliere | `view`, `claim`, `streak` |
| `/dashboard` | Link dashboard web admin | (admin only) |

---

## 3. Comandi admin (19)

| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/admin setup` | Setup server multi-game | `run`, `status` |
| `/admin game` | Gestione catalogo giochi | `add`, `list`, `remove`, `update` |
| `/admin gamemode` | Server privati community | `add`, `edit`, `remove`, `list`, `post panel` |
| `/admin rolepanel` | Pannello selezione giochi | `channel [canale]` |
| `/admin reactionrole` | Pannelli reaction role | `add`, `post`, `remove`, `list` |
| `/admin hobbies` | Self-role hobby (10 preset) | `channel`, `interests` |
| `/admin autothread` | Auto-thread canali | `enable`, `disable`, `list` |
| `/admin config` | Configurazione bot | `view`, `levelup`, `welcome`, `announcements` |
| `/admin guida` | Post/refresh guide | — |
| `/admin gametest` | Test news giochi | `fetch`, `check` |
| `/admin giveaway` | Giveaway | `create`, `end`, `list` |
| `/admin feedback` | Segnalazioni admin | `setup`, `stats`, `list`, `close` |
| `/admin gamenight` | Game night ricorrenti | `add`, `list`, `toggle`, `remove` |
| `/admin tempvc` | Canali vocali temporanei | `setup`, `disable`, `status` |
| `/admin cmd` | Comandi personalizzati (!nome) | `add`, `remove`, `list` |
| `/admin schedule` | Messaggi programmati (cron) | `add`, `remove`, `list`, `toggle` |
| `/admin xpevent` | Eventi XP moltiplicatore | `start`, `stop`, `status` |
| `/admin onboarding` | Pannello guida comandi | `post`, `dm [@user]` |
| `/admin restore` | Ripristino backup DB | `list`, `show`, `download` |

---

## 4. Comandi moderazione (9)

| Comando | Descrizione | Sintassi |
|---------|-------------|----------|
| `/userinfo <user>` | Info dettagliate membro | `@user` |
| `/purge <n> [user]` | Bulk delete messaggi | `1-100`, opzionale @user |
| `/warn <user> <motivo> [severita]` | Warning + ruolo + escalation | `low/medium/high` |
| `/clearwarn <user>` | Rimuovi warning + ruolo | `@user motivo` |
| `/warnings <user>` | Storico warning | `@user` |
| `/mute <user> <durata> [motivo]` | Timeout membro | minuti |
| `/unmute <user>` | Rimuovi timeout | `@user` |
| `/slowmode <canale> <secondi>` | Slowmode canale | `0-21600` |
| `/lockdown [stato]` | Lock/unlock server | `on/off/status` |

> I warning hanno **escalation automatica**: low → medium → high → azione moderazione (mute/kick).

---

## 5. Sistema BP (Bloods Points) — come funziona nel bot

### Comando `/bp`
| Subcommand | Chi può usarlo | Cosa fa |
|------------|----------------|--------|
| `/bp balance` | Tutti | Mostra il tuo saldo BP |
| `/bp transfer @user [amount]` | Tutti | Trasferisci BP a un altro player |
| `/bp leaderboard` | Tutti | Classifica BP della gilda |
| `/bp roster` | Tutti | Mostra il roster raid attivo |
| `/bp add @user [amount]` | Admin/RL | Aggiungi BP a un player |
| `/bp remove @user [amount]` | Admin/RL | Rimuovi BP da un player |
| `/bp set @user [amount]` | Admin | Imposta BP di un player |
| `/bp reset` | Admin | Reset totale BP (fine tier) |
| `/bp roster add/remove @user` | Admin/RL | Gestisci roster raid |
| `/bp roster clear` | Admin | Svuota roster raid |

### Comando `/loot` (roll system)
| Subcommand | Chi può usarlo | Cosa fa |
|------------|----------------|--------|
| `/loot start [item] [min_bid] [max_bid]` | RL | Avvia un roll per un item |
| `/loot roll [item_id] [bid]` | Raider | Bid BP sull'item |
| `/loot list` | Tutti | Lista roll attivi |
| `/loot status` | RL | Stato roll corrente |
| `/loot close` | RL | Chiudi roll, assegna vincitore |
| `/loot cancel` | RL | Annulla roll |
| `/loot recap` | Tutti | Riepilogo roll passati |

### Formula score roll
```
score = roll * (1 + bid / 50)
```
- `roll` = numero casuale (1-100)
- `bid` = BP che il player decide di spendere
- Più BP spendi, più alto il score — ma non vinci sempre se la fortuna è contro

### Ruoli che possono gestire BP/loot
`Guida Incursioni`, `Guida Spedizioni`, `Officer`, `Officer Reclutatore`, `Officer in Prova`, `Bloods Admin`, `Consigliere`, `Founder`, `Owner`

---

## 6. Sistema Raid / Spedizioni

### Comando `/spedizione` (signup raid WoW)
- Il RL crea una spedizione con `/spedizione create`
- I player si iscrivono con `/spedizione join`
- Selezione **classe e spec** durante l'iscrizione
- **Check idoneità** via Blizzard API (il bot verifica il tuo PG linkato)
- Slot limitati con protezione race-condition
- Disiscrizione con `/spedizione leave`

### Comando `/raidreq` (config requisiti raid — admin)
- Imposta il ilvl minimo richiesto
- Imposta requisiti tier set (2pc+)
- Imposta achievement richiesti
- Il bot usa questi requisiti per il check idoneità

### Comando `/raidstatus`
- `/raidstatus me` — verifica la tua idoneità raid
- Il bot controlla via Blizzard API:
  - Item level del PG linkato
  - Tier set bonus (2+ pezzi)
  - Achievement completati
  - Storico presenze raid
- **Ruolo "Progress"** assegnato/rimosso automaticamente in base all'idoneità
- Cache di 6 ore

### Raid Scheduler (automatico)
- Check orario per giorni di raid configurati
- Auto-post promemoria il giorno prima del raid
- Mostra count idonei/non idonei
- Configurabile: giorni raid, orari, canale post

### Comando `/event` (eventi community generici)
- `/event create [nome] [data] [ora] [descrizione]` — crea evento
- `/event list` — lista eventi
- `/event view [id]` — dettagli evento
- `/event delete [id]` — elimina (admin)
- Iscrizione tramite bottoni (join/leave)

---

## 7. Integrazione WoW (Battle.net API)

### Link account
```
/link battlenet NomePersonaggio-Reame
```
Esempio: `/link battlenet Bäba-Pozzo dellEternità`

### Cosa controlla il bot
- **Profilo personaggio:** ilvl, equipment, achievement
- **Tier set:** rileva bonus 2pc/4pc
- **Realm:** caching 24h per risparmiare API call
- **Caratteri accentati:** supportati (Bäba, Jösé, ecc.)

### Pannello professioni WoW
- 14 professioni: Alchimia, Forgia, Incanto, Ingegneria, Inscription, Gioielleria, Conciatura, Sartoria, Erbalismo, Mining, Skinning, Cucina, Pesca, First Aid
- Auto-crea ruoli `WoW [Professione]`
- Auto-crea canali professione
- Un player può selezionare fino a 5 professioni
- UI: `src/ui/wowProfessionPanel.js`

### Comandi WoW utili
- `/gamemeta wow` — news, patch notes, server status
- `/raidstatus me` — idoneità raid
- `/link battlenet` — link account
- `/refreshstats` — aggiorna stat da Blizzard API
- `/raidattendance mark` — segna presenze raid e assegna BP (Raid Leader+)
- `/keys list|me|leaderboard` — Mythic+ keys e score Raider.io

### Warcraft Logs Auto-Post (NUOVO)
Il bot controlla ogni 10 minuti se ci sono nuovi report Warcraft Logs per la gilda e li posta automaticamente in `#raid-log`.

**Configurazione (.env):**
```
WCL_CLIENT_ID=xxx
WCL_CLIENT_SECRET=xxx
WCL_GUILD_NAME=Bloods
WCL_GUILD_SERVER=Pozzo dell'Eternity
WCL_REGION=EU
```
Credenziali: https://www.warcraftlogs.com/api/clients/

**Formato post:** embed con titolo report, zona, data, link diretto a WCL.

### Affix M+ Auto-Post (NUOVO)
Ogni martedì alle 10:05 (dopo reset EU) il bot posta gli affix M+ della settimana in `#keys-settimanali`.

**Fonte:** Raider.io API (nessuna auth richiesta)
**Contenuto:** affix per livello (+4, +7, +10, +12), descrizione, dungeon attivi Season 2.

### Presenze Raid → BP Automatici (NUOVO)
Il Raid Leader usa `/raidattendance mark` dopo ogni raid per segnare le presenze e assegnare BP automaticamente.

**BP assegnati:**
| Evento | BP |
|--------|-----|
| Presenza | +10 |
| Puntualità (online 15min prima) | +5 |
| Kill boss Normal | +5 per boss |
| Kill boss Heroic | +10 per boss |
| Kill boss Mythic | +20 per boss |
| Wipe night (nessun kill) | +8 |
| No-show (raider mitico) | -15 |

**Auto-detect:** il bot rileva chi è nel canale vocale raid. Il RL può specificare il canale o lasciare che il bot lo trovi automaticamente.

**Esempio:**
```
/raidattendance mark raid_name: The Venomous Abyss kills_heroic: 3 kills_mythic: 1
```

### Mythic+ Keys + Raider.io (NUOVO)
Il comando `/keys` mostra le key M+ disponibili in gilda usando l'API Raider.io.

- `/keys list` — tutte le key completate questa settimana dai gildani linkati
- `/keys me` — il tuo profilo Raider.io (score, runs, ilvl)
- `/keys leaderboard` — classifica M+ interna per score Raider.io

**Requisito:** ogni player deve aver linkato il proprio PG con `/link battlenet NomePG-Reame`.

---

## 8. Sistema XP / Leveling

### Come si guadagna XP
| Attività | XP | Note |
|----------|----|------|
| Messaggio | 1 XP | Max 50 XP / 60s (anti-spam) |
| Vocale (canali gioco) | 5 XP/min | Solo canali gioco, non AFK |
| Assegnazione ruolo gioco | +10 XP | Bonus una tantum |
| Server boost | +500 XP | Nitro Booster |
| Eventi XP | 2x-10x | Durante `/admin xpevent` |

### Formula livello
```
level = floor(sqrt(xp / 100))
```
- Livello 1: 100 XP
- Livello 10: 10.000 XP
- Livello 50: 250.000 XP
- Livello 100: 1.000.000 XP

### Reward automatici
- Livello 10 → `Giocatore Attivo`
- Livello 50 → `Veterano`
- Livello 100 → `Leggenda`
- Configurabile via dashboard

---

## 9. Ticket System

### Flow
1. Utente clicca **"Apri Ticket"** in `#ticket-assistenza`
2. Bot crea canale privato `ticket-{username}`
3. Permessi: utente + staff solo
4. Utente descrive il problema
5. Staff risponde
6. Bottone **"Chiudi Ticket"** → canale eliminato dopo 5 secondi

### Staff che vedono i ticket
`Bloods Admin`, `Consigliere`, `Founder`, `Owner`, `Officer`, `Officer Reclutatore`, `Officer in Prova`

### Categoria
`Assistenza`

---

## 10. Sistema Feedback Admin

### Flow
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

### Stati
- 🔴 Aperto → 🟠 Approvato → 🔵 In Lavorazione → 🟢 Risolto / ⚪ Chiuso

### Comandi
- `/admin feedback setup [canale]` — crea il canale con il bottone
- `/admin feedback stats` — statistiche ticket
- `/admin feedback list` — lista ticket
- `/admin feedback close [id]` — chiudi ticket

> Solo Owner/Founder può approvare fix.

---

## 11. Dashboard Web Admin

### Accesso
- URL: `http://SERVER_IP:4567/` (porta configurabile via `DASHBOARD_PORT`)
- Auth: Discord OAuth2 (JWT)
- Comando `/dashboard` per ottenere il link

### Pagine (30)
- **Overview** — dashboard generale
- **Analytics** — grafici attività
- **Audit Log** — log azioni admin
- **Automod** — regole auto-moderazione
- **Badges** — gestione badge
- **Discord Logs** — log eventi Discord
- **Events** — gestione eventi
- **Games** — catalogo giochi
- **Leaderboard** — classifiche
- **Level Rewards** — reward leveling
- **Members** — lista membri con paginazione
- **Moderation** — azioni moderazione
- **Raid** — config raid + idoneità + stats
- **Settings** — impostazioni gilda
- **Health** — stato bot
- **Search** — ricerca (Ctrl+K)
- **Scheduled Messages** — messaggi programmati
- **Custom Commands** — comandi personalizzati
- **Giveaways** — gestione giveaway
- **Starboard** — messaggi best
- **XP Events** — eventi XP
- **Birthdays** — compleanni
- **Tags** — guide salvate
- **Feedback** — segnalazioni admin

### Security
- Helmet middleware
- Rate limiting (general: 100/15min, auth: 5/15min, mod: 30/15min)
- JWT authentication
- Input validation su tutte le route

---

## 12. Gerarchia ruoli Discord (reale)

```
Owner
  ↓
Founder
  ↓
Consigliere
  ↓
Bloods Admin
  ↓
Bot (ruolo bot)
  ↓
Officer
  ↓
Officer Reclutatore
  ↓
Officer in Prova
  ↓
Guida Incursioni / Guida Spedizioni
  ↓
Nitro Booster
  ↓
Capo Fazione
  ↓
Streamer
  ↓
Progress
  ↓
Giocatore Attivo (livello 10)
  ↓
Veterano (livello 50)
  ↓
Leggenda (livello 100)
  ↓
Bloods (membro gilda WoW)
  ↓
Membro della community (verificato)
  ↓
Ruoli gioco (WoW, Apex, CS2, ecc.)
  ↓
Non Verificato
  ↓
@everyone
```

### Permessi per area
| Area | Chi vede | Permessi |
|------|----------|----------|
| **Area Iniziale** | @everyone | View, Send (limitato), Voice |
| **Forum** | Staff (Officer+) | Full access |
| **GILDA** (7 cat.) | Bloods + Staff | Full community perms |
| **COMMUNITY** (4 cat.) | Membro community + Bloods + Nitro + Staff | Full community perms |
| **GAME** (18 cat.) | Ruolo gioco + Bloods + Nitro + Staff | Full community perms |
| **Assistenza** | Staff + utente ticket | Ticket-based |
| **Streaming Zone** | Community + | Streamer access |
| **Prigione** | Staff | Solo staff |

### Setup permessi
```bash
# Setup completo (applica a tutte le 31 categorie)
node src/scripts/setupPermissions.js

# Anteprima senza modifiche
node src/scripts/setupPermissions.js --dry-run
```

---

## 13. Servizi automatici (cron)

| Servizio | Frequenza | Cosa fa |
|----------|-----------|---------|
| ActivityTracker | 60s | Traccia tempo vocale per XP |
| LeaderboardScheduler | 5min | Cache classifiche |
| MemberCounterService | 5min | Contatore membri in voice channel |
| GiveawayService | 30s | Auto-end giveaway scaduti |
| GuidePoster | 30min | Aggiorna guide canali |
| NewsPoster | 1h | Pubblica news giochi |
| MetaScheduler | 6h | Fetch patch notes |
| RaidScheduler | configurabile | Promemoria raid |
| CleanupScheduler | 24h (4AM) | Pulisci activity_log >30gg |
| StatRefreshScheduler | 24h (5AM) | Auto-refresh stat API |
| BackupScheduler | Daily 4AM | Backup DB gzip (retention 30gg) |
| WeeklyStatsService | Domenica 18:00 | Statistiche settimanali |
| MilestoneService | 5min | Announce milestone membri (50, 100, 150...) |
| GuildChallengeService | 10min | Challenge community |
| AlertService | 60s | Monitoraggio memory/errori |
| AntiRaidService | Real-time | Anti-raid mass-join |
| ScheduledMessageService | cron | Messaggi programmati |
| FeedbackWatcher | 30s | Sync pending-fixes.json → Discord |
| **WarcraftLogsService** | 10min | Auto-post nuovi report WCL in `#raid-log` (richiede WCL_CLIENT_ID/SECRET) |
| **AffixScheduler** | Martedì 10:05 | Auto-post affix M+ della settimana in `#keys-settimanali` (Raider.io API) |
| **RaidAttendanceService** | On-demand | BP automatici da presenze raid (via `/raidattendance mark`) |

---

## 14. Altri bot sul server

Il server ha 7 bot esterni oltre al nostro. **5 sono ridondanti e dovrebbero essere rimossi:**

| Bot | Funzione | Status | Azione |
|-----|----------|--------|--------|
| **Streamcord** | Twitch alerts | Complementare | **Tenere** |
| **Wipefest** | Raid analysis | Complementare | **Tenere** |
| **Rythm** | Music | Sostituito da `/music` | **Rimuovere** |
| **ChannelBot** | Dynamic voice | Sostituito da `/admin tempvc` | **Rimuovere** |
| **Ticket Tool** | Ticket | Sostituito dal nostro | **Rimuovere** |
| **Raid-Helper** | Raid signup | Sostituito da `/spedizione` | **Rimuovere** |
| **inter·punct** | Punctuation | Inutile | **Rimuovere** |

> ⚠️ **Streamcord e ChannelBot hanno permessi Administrator** — potenziale conflitto con il nostro bot. Rimuovere ChannelBot risolve il rischio.
> Per rimuovere un bot: Server Settings → Integrations → seleziona bot → Remove.

---

## 15. Deploy e manutenzione

### Comandi deploy
```bash
# Registra nuovi comandi slash
node src/scripts/deploy-commands.js

# Riavvia bot
pm2 restart bloods-hub-bot

# Verifica
node tests/smoke.test.js
npm test              # Full pipeline (176 test)
```

### Build dashboard
```bash
cd dashboard && npm install && npm run build
# Output in dashboard/out/, servita dal bot su :4567
```

### Backup DB
```bash
npm run backup    # mysqldump → backups/backup_YYYY-MM-DD.sql.gz (30gg retention)
```

### Migrations
```bash
npx sequelize-cli migration:run    # Esegui migrations pendenti
npx sequelize-cli migration:undo   # Rollback ultima migration
```

### Health check
- `GET /health` → status JSON (porta 3000)
- `GET /metrics` → Prometheus metrics
- `GET /alerts/stats` → alert monitoring stats

### Alert automatici
- Memory > 400MB
- Uncaught exceptions
- Unhandled promise rejections
- Bot disconnesso

### CI/CD
- `.github/workflows/ci.yml` — test + build dashboard su push/PR
- `.github/workflows/deploy.yml` — auto-deploy via SSH su push main

---

## 16. Giochi supportati (18)

Apex Legends, CS2, Dota 2, FFXIV, League of Legends, Minecraft, Valorant, World of Warcraft, Delta Force, Diablo 4, Palworld, Pokémon, StarCraft 2, Metin2, Rocket League, Call of Duty, Path of Exile, DayZ

Ogni gioco ha:
- Categoria Discord dedicata (canali: generale, news, comunicazioni, composizioni, vocale 1, vocale 2)
- Ruolo gioco (assegnabile via pannello `#selezione-giochi`)
- Modulo meta fetcher (`src/modules/games/`)
- Integrazione API esterna (dove disponibile)

---

*Manuale Bot Bloods Hub v1.0 — Aggiornato a patch 12.1 / Season 2. Per modifiche al bot, vedi la cartella `bloods-hub-bot` e l'AGENTS.md del progetto.*
