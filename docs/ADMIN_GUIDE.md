# ADMIN_GUIDE — Bloods Hub Bot

Audience: **Discord staff** (Owner, Founder, Consigliere, Officer, Officer Reclutamento, Raid Leader) della gilda Bloods.
Questa guida spiega come gestire il server Discord, il bot e la dashboard day-to-day. Non richiede conoscenze di programmazione.

> Per la guida operativa completa (colloqui, raid, BP, moderazione): vedi anche `docs/GUIDE_OFFICER.md`

---

## 1. Architettura

Il server Discord è organizzato in 3 livelli:

| Livello | Visibilità | Contenuto |
|---------|-----------|-----------|
| **Pubblico** | `@everyone` | Regolamento, benvenuto, comandi bot, selezione giochi, invito |
| **Gilda (WoW)** | Membri Bloods | Info, PvE (raid/roster/BP), PvP (RBG/arena), Mythic+, riunioni |
| **Game communities** | Solo membri con ruolo del gioco | Una categoria privata per ogni gioco (WoW, Valorant, LoL, ecc.) |

Il bot enforce questa struttura: `@everyone` ha `ViewChannel` negato su tutto tranne i canali pubblici. Ogni categoria gioco è visibile solo al ruolo corrispondente.

---

## 2. Setup iniziale (una tantum)

Esegui in ordine, come Administrator:

1. **`/setup run`** — migra il server nella nuova architettura
   - Crea canali pubblici se mancanti
   - Blocca `@everyone` fuori dalle categorie non pubbliche
   - Registra i membri WoW esistenti
2. **`/rolepanel`** (in `#selezione-giochi`) — posta il pannello self-role interattivo
3. Per ogni gioco: **`/game add`** (vedi §4)
4. **Configura BP**: `/raidreq` per impostare requisiti raid
5. **Configura canali**: `WELCOME_CHANNEL_ID`, `RULES_CHANNEL_ID`, etc. in `.env`

Verifica stato: **`/setup status`**

---

## 3. Pannello self-role

Il pannello in `#selezione-giochi` è un singolo messaggio Discord con:
- **Drop-down menu** multi-select con tutti i giochi attivi
- **Quick-toggle buttons** per i primi 4 giochi
- **Clear all** button

Gli utenti si auto-assegnano i ruoli — lo staff non deve distribuire ruoli manualmente.

- **Refresh**: `/rolepanel` in `#selezione-giochi` (il vecchio messaggio resta, cancellalo manualmente se vuoi)
- Solo giochi con `is_active = true` appaiono nel menu

---

## 4. Aggiungere un nuovo gioco

**`/game add`** (richiede *Manage Server*):

```
/game add
  code:        valorant          (lowercase, no spaces)
  name:        Valorant          (display name)
  category:    FPS               (genre)
  api_provider: Riot             (Steam / Battle.net / Riot / Manual / None)
  icon_url:    https://...png    (optional)
```

Il bot crea automaticamente:
1. Ruolo Discord `Game • Valorant`
2. Categoria privata `Valorant` (visibile solo al ruolo)
3. Canali standard: `#generale`, `#news`, `#comunicazioni`, `#composizioni`, `🔊 Vocale 1`, `🔊 Vocale 2`
4. Record nel DB con `role_id` e `category_id` collegati

Dopo l'aggiunta: **re-run `/rolepanel`** per aggiornare il menu.

### Gestione giochi
- **`/game list`** — lista giochi registrati
- **`/game update`** — re-linka ruolo/categoria
- Dashboard → **Games** per gestire da web

---

## 5. Disabilitare un gioco (senza perdere dati)

1. Dashboard → Games → toggle `is_active` su off
2. Re-run `/rolepanel` — il gioco scompare dal menu
3. Categoria, ruolo e canali restano intatti

---

## 6. Onboarding nuovi membri

1. Nuovo membro entra → vede solo canali pubblici
2. Legge `#regolamento`, va in `#selezione-giochi`, sceglie i giochi
3. Il bot assegna i ruoli → le categorie private appaiono
4. Per entrare nel roster raid: apre ticket in `#apri-ticket` → colloquio Officer

### Colloquio (10 min)
- Domande standard: esperienza, ruolo, disponibilità, Discord/mic, obiettivi
- Assegnazione tag: `@Raider`, `@PvP`, `@Social`
- Normalizzazione nickname (Nome-PG)
- Mentor assegnato se richiesto

> Template completo colloquio: `docs/GUIDE_OFFICER.md` §2

---

## 7. Comandi utili per staff

| Comando | Scopo |
|---------|-------|
| `/mystats` | Stats membro (XP, livello, messaggi, voice) |
| `/stats` | Riepilogo community |
| `/leaderboard` | Classifica per gioco o attività Discord |
| `/gamemeta` | Patch note / meta / server status |
| `/refreshstats` | Forza refresh stats API esterne |
| `/serverinfo` | Info server Discord |
| `/serverstats` | Statistiche server dettagliate |
| `/members` | Lista membri con filtri |
| `/recruit` | Gestione candidati reclutamento |
| `/search` | Ricerca messaggi per canale |

---

## 8. Permessi — cheat sheet

Il bot gestisce automaticamente questi permessi:

- `@everyone`: `ViewChannel` **negato** ovunque tranne canali pubblici
- `Game • <Name>`: `ViewChannel` **permesso** sulla propria categoria
- Categoria Bloods (WoW): visibile per membri Bloods
- Canali staff (`#staff-chat`, `#officer-only`, `#log-staff`): solo Officer+
- Bot: `Administrator` (necessario per gestione canali/ruoli)

### Permessi manuali da verificare
- Canali `#officer-only`: solo ruoli Officer+
- Categoria `Forum`: solo staff
- `#log-staff`: solo Officer+ (contiene log sensibili)
- `#dashboard-admin`: solo Officer+ (link dashboard admin)

---

## 9. Audit trail

Ogni azione amministrativa viene registrata:
- **Log file**: `logs/bot-YYYY-MM-DD.log` (14 giorni retention)
- **Audit log DB**: tabella `audit_logs` (query da dashboard → Audit Log)
- **Discord log**: tabella `discord_logs` (eventi Discord)

Azioni tracciate: `/setup run`, `/game add`, `/game update`, `/rolepanel`, ban, kick, mute, warn, modifiche BP, cambiamenti ruoli.

---

## 10. Dashboard admin

URL: **[bloodswow.it/dashboard](https://bloodswow.it/dashboard)**

Accesso: login con Discord OAuth (richiede ruolo Officer+ nel server).

### Pagine principali
| Pagina | Funzione |
|--------|----------|
| **Members** | Lista, ruoli, stats, ban/kick |
| **Moderation** | Warn, mute, ban, automod |
| **Raid** | Config, roster, eligibilità, loot |
| **Events** | Crea/gestisci eventi |
| **Giveaways** | Crea/gestisci giveaway |
| **Games** | Aggiungi/gestisci giochi |
| **Settings** | Configurazione gilda |
| **Audit Log** | Storico azioni admin |
| **Analytics** | Statistiche community |
| **Health** | Stato bot e servizi |

> Lista completa: `docs/GUIDE_OFFICER.md` §7

---

## 11. Troubleshooting

| Sintomo | Fix |
|---------|-----|
| Nuovo gioco non appare nel menu | Re-run `/rolepanel` dopo `/game add` |
| Membro non vede una categoria | Verifica permessi categoria — il ruolo deve avere `ViewChannel` allow |
| `/leaderboard` mostra "No data" | Stats si popolano con `/refreshstats` o attività Discord (voice/message) |
| `@everyone` vede canali che non dovrebbe | Quel canale ha un allow esplicito pre-migrazione. Modifica permessi manualmente |
| Bot non risponde | `pm2 status` → se down: `pm2 restart bloods-hub-bot` |
| Comandi slash non appaiono | `npm run deploy:commands` |
| Dashboard non carica | `npm run dashboard:build` + `pm2 restart bloods-hub-bot` |
| Errore 401 API | Token JWT scaduto — logout/login |
| Errore 403 API | Permessi insufficienti — verifica ruolo Discord |
