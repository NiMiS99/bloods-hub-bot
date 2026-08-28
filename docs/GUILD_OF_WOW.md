# Integrazione Guilds of WoW (GoW)

> Guida per integrare la gilda Bloods con [Guilds of WoW](https://guildsofwow.com) — piattaforma gratuita per gilde WoW con API, roster sync, reclutamento e eventi.

---

## 1. Cos'è Guilds of WoW

Guilds of WoW (GoW) è una piattaforma gratuita che si integra con:
- **Battle.net API** — roster gilda, personaggi, item level, M+ progress
- **Warcraft Logs** — combat log, parse, progressione raid
- **Raider.IO** — M+ score, raid progress
- **Discord** — sync eventi, post, recruitment
- **In-Game Addon** — sync bidirezionale eventi e roster

### Funzionalità chiave per Bloods
- **Roster automatico**: import membri da Battle.net API
- **Audit roster**: chi è attivo, chi non logga da X giorni
- **Reclutamento**: pagina gilda pubblica con application form
- **Eventi**: calendario raid/M+/PvP con RSVP bidirezionale (web ↔ in-game)
- **Reports**: guild report, player report, audit report
- **API**: endpoint members e recruitment (richiede management API key)
- **Wishlist**: membri possono creare wishlist gear

---

## 2. Setup GoW per Bloods

### Step 1: Creare pagina gilda
1. Vai su https://guildsofwow.com
2. Login con Battle.net (OAuth sicuro)
3. Cerca "Bloods" su "Pozzo dell'Eternità" EU
4. Crea la pagina gilda (richiede rank GM o Officer rank 1)

### Step 2: Configurare pagina
- **Descrizione**: allineare con `siteConfig.js` (soft-progress, Midnight, PvP, community 360°)
- **Reclutamento**: attivare, impostare ruoli cercati (tank, healer, DPS)
- **Eventi**: importare schedule raid (Mar/Gio 21:00-24:00, Dom 21:00-23:00 social, Mer 21:00-23:00 PvP)
- **Discord integration**: collegare server Discord Bloods

### Step 3: Ottenere API key
1. GoW → Manage → API → Generate Management API Key
2. Salvare la key in `.env`:
   ```
   GOW_API_KEY=your_management_api_key
   ```
3. Aggiungere a `.env.example`:
   ```
   GOW_API_KEY=
   ```

### Step 4: Installare Sync App (opzionale)
- Download: https://guildsofwow.com/install-applications
- Desktop app che sincronizza eventi e roster in-game
- Installa automaticamente l'addon in WoW
- Richiede Windows/Mac

---

## 3. Integrazione con il bot

### Dati sincronizzabili GoW → Bot

| Dato GoW | Tabella Bot | Note |
|----------|-------------|------|
| Roster membri | `users` | Aggiorna `legacy_wow_rank`, last login |
| Item level | `game_stats` | metric: `ilvl`, valueNum: ilvl |
| M+ score | `game_stats` | metric: `mythic_plus_score` |
| Raid progress | `game_stats` | metric: `raid_progress` |
| Attendance eventi | `raid_attendances` | Sync RSVP |

### Implementazione futura

Creare un servizio `src/services/gowService.js`:

```js
// Esempio struttura (da implementare)
const axios = require('axios');
const config = require('../config');

class GowService {
  constructor() {
    this.apiKey = process.env.GOW_API_KEY;
    this.baseUrl = 'https://guildsofwow.com/api/v1';
    this.guildName = 'Bloods';
    this.server = "Pozzo dell'Eternità";
    this.region = 'EU';
  }

  get enabled() { return Boolean(this.apiKey); }

  async fetchRoster() {
    // GET /api/v1/guilds/{guildName}/{server}/{region}/members
    // Returns: [{ name, rank, class, spec, ilvl, lastOnline, mythicPlusScore }]
  }

  async fetchRecruitmentApplications() {
    // GET /api/v1/guilds/{guildName}/{server}/{region}/applications
    // Returns: [{ name, class, spec, ilvl, message, appliedAt }]
  }

  async syncRosterToDb(models) {
    // Per ogni membro GoW:
    // - Upsert in users (aggiorna last_login, rank)
    // - Upsert in game_stats (ilvl, m+ score)
  }
}

module.exports = new GowService();
```

### Comando slash `/gow` (futuro)

```
/gow roster     — sync roster da GoW al DB
/gow recruit    — lista candidature GoW
/gow sync       — sync completo (roster + stats + attendance)
```

---

## 4. Integrazione Battle.net API (già presente)

Il bot ha già `src/services/api/battleNetApi.js` che usa `BATTLE_NET_CLIENT_ID/SECRET`.

### Endpoint utili per Bloods
- **Guild roster**: `/data/wow/guild/{realm}/{name}/roster` — lista membri con rank
- **Character profile**: `/profile/wow/character/{realm}/{name}` — ilvl, class, spec
- **Mythic+**: `/profile/wow/character/{realm}/{name}/mythic-keystone-profile` — score, runs
- **Raid progress**: `/profile/wow/character/{realm}/{name}/raid-progression` — boss kill

### Config attuale (.env)
```
BATTLE_NET_CLIENT_ID=xxx
BATTLE_NET_CLIENT_SECRET=xxx
```

Questi sono già sufficienti per l'integrazione base. GoW offre un'interfaccia più ricca e gestita.

---

## 5. Integrazione Warcraft Logs (già presente)

Il bot ha già config WCL in `src/config/index.js`:

```js
warcraftLogs: {
  clientId: process.env.WCL_CLIENT_ID,
  clientSecret: process.env.WCL_CLIENT_SECRET,
  guildName: 'Bloods',
  guildServer: "Pozzo dell'Eternità",
  region: 'EU',
}
```

### Setup WCL
1. Vai su https://www.warcraftlogs.com/api/clients/
2. Crea un client → ottieni `CLIENT_ID` e `CLIENT_SECRET`
3. Aggiungi a `.env`:
   ```
   WCL_CLIENT_ID=your_client_id
   WCL_CLIENT_SECRET=your_client_secret
   ```
4. Il bot può fetchare: parse DPS/HPS, kill boss, progressione raid

---

## 6. Integrazione Raider.IO (futuro)

Raider.IO offre un'API pubblica gratuita (rate-limited):

```
GET https://raider.io/api/v1/characters/profile?region=eu&realm=pozzo-delleternita&name=charname
```

Ritorna: M+ score, raid progress, best runs.

### Implementazione futura
Creare `src/services/api/raiderIoApi.js` come estensione di `BaseGameApi`:
- `fetchProfile(characterName)` → score, raid progress
- `fetchStats(characterName)` → metriche M+ e raid
- Sync automatico per roster raid mitico

---

## 7. Strategia di integrazione consigliata

### Phase 1 (immediata)
- Creare pagina gilda su GoW
- Configurare reclutamento su GoW
- Linkare GoW nel canale `#reclutamento` Discord
- Aggiungere link GoW nel sito (pagina "Unisciti")

### Phase 2 (breve termine)
- Ottenere GoW API key
- Implementare `gowService.js` (sync roster)
- Comando `/gow roster` per sync manuale

### Phase 3 (medio termine)
- Sync automatico giornaliero (cron)
- Comando `/gow recruit` per candidature
- Integrazione Raider.IO per M+ score
- Dashboard: pagina "GoW Sync" con stato sincronizzazione

### Phase 4 (lungo termine)
- Sync bidirezionale eventi (GoW ↔ bot)
- Auto-aggiornamento eligibilità raid basato su GoW roster
- Alert automatici per membri inattivi (GoW last online)

---

## 8. Link utili

- **GoW**: https://guildsofwow.com
- **GoW API docs**: https://guildsofwow.com/api (richiede login)
- **GoW Sync App**: https://guildsofwow.com/install-applications
- **GoW FAQ**: https://guildsofwow.com/faq
- **Battle.net API**: https://develop.battle.net
- **Warcraft Logs API**: https://www.warcraftlogs.com/api/docs
- **Raider.IO API**: https://raider.io/api
