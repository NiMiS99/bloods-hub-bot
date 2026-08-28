# GUIDA OFFICER — Bloods Hub Bot

> Guida per Officer, Raid Leader e staff della gilda Bloods. Copre gestione membri, raid, BP, moderazione e dashboard admin.

---

## 1. Ruoli e responsabilità

| Grado | Responsabilità |
|-------|----------------|
| **Owner** | Decisioni finali, espulsioni, configurazione bot |
| **Founder** | Co-fondatori, proposte modifiche regolamento |
| **Consigliere** | Coordina Officer, gestisce espulsioni |
| **Officer** | Convivenza, segnala problemi, colloqui reclutamento |
| **Officer Reclutamento** | Reclutamento dedicato, gestisce ticket |
| **Raid Leader** | Gestisce raid, tattiche, assegnazione loot |

### Tag trasversali
`@Tank` / `@Healer` / `@DPS` · `@Raider Mitico` · `@PvP` · `@Social` · `@Mentor`

---

## 2. Colloquio di reclutamento

### Domande standard
1. **Esperenza**: Quanto hai giocato a WoW? Che content hai clearato?
2. **Ruolo**: Main class/spec? Off-spec? Disponibilità a rerollare?
3. **Disponibilità**: Puoi garantire Mar/Gio 21:00-24:00? Quante sere su 8?
4. **Discord**: Hai microfono funzionante? Sei disposto a usare Discord?
5. **Obiettivi**: Cosa cerchi dalla gilda? Raid mitico, M+, PvP, social?
6. **Alt**: Hai alt rilevanti? A che livello?

### Criteri assegnazione tag
- **@Raider**: esperienza raid, disponibilità 4+ sere, 60% presenza
- **@Raider Mitico**: tutti i requisiti (vedi §5), roster a 20
- **@PvP**: interesse RBG/arena, rating 1800+ preferibile
- **@Social**: M+, eventi, community, senza obblighi roster

### Post-colloquio
1. Assegna il tag tramite il pannello del bot o manualmente
2. Normalizza il nickname (Nome-PG)
3. Invita a presentarsi in `#presentazioni`
4. Se Raider, assegna un mentor se richiesto
5. Aggiungi al roster raid se idoneo

---

## 3. Gestione raid

### Pre-raid
- Verifica eligibilità: `/raidstatus` per ogni membro
- Compila il roster: dashboard → Raid → Roster
- Posta il sign-up: `/event` o pannello dedicato
- Controlla consumabili e addon

### Durante il raid
- Usa `/loot` per ogni drop
- Track presenze: il bot registra automaticamente chi è in vocale
- Usa `/raidattendance` per verificare le presenze

### Post-raid
- Assegna BP: il bot calcola automaticamente presenza + puntualità
- Aggiorna Warcraft Logs (il bot sincronizza via API)
- Verifica il loot registrato: dashboard → Raid → Loot recente

### Comandi raid utili
| Comando | Chi | Descrizione |
|---------|-----|-------------|
| `/raidreq` | Raid Leader | Configura requisiti raid (ilvl, attendance, addon) |
| `/raidcomp` | Tutti | Visualizza composizione roster |
| `/raidattendance` | Tutti | Storico presenze |
| `/raidstatus` | Tutti | Check eligibilità personale |
| `/loot` | Raid Leader | Avvia roll loot con BP |

---

## 4. Bloods Points (BP) — Gestione

### Come si ottengono i BP
- Presenza raid: +10 BP per serata
- Puntualità (online 15 min prima): +5 BP bonus
- First kill boss: +20 BP
- Kill boss regolare: +5 BP
- M+ gilda: +3 BP per key completata
- PvP gilda: +5 BP per evento

### Gestione manuale BP
Da dashboard admin → **Raid** → **BP Management**:
- Visualizza saldo di tutti i membri
- Modifica saldo manualmente (con audit log)
- Reset stagionale BP (da concordare con staff)

### Dispute loot
Se un membro contesta un assegnazione:
1. Verifica il log: dashboard → Raid → Loot History
2. Controlla il roll e la bid
3. Se errore del bot, modifica manualmente il saldo BP
4. Comunica la risoluzione al membro

---

## 5. Requisiti Raider Mitico

### Obbligatori
- Discord + microfono
- Online 15 min prima dell'inizio
- Consumabili: fiala, cibo, runa, pozioni, gemme, enchant
- Addon: DBM/BigWigs, WeakAuras, Details
- Presenza 75% (6/8 raid al mese)
- M+ settimanale: almeno 1 key +6/+8
- Warcraft Logs attivi

### Progressione tag
```
@Social → @Raider (4+ sett, 60% pres.) → @Raider Mitico (75% pres, tutti req)
```

### Revoca tag
Se un Raider Mitico non mantiene i requisiti:
1. Contatto personale (policy "no silent kick")
2. Periodo di prova (2 settimane)
3. Se non migliora, downgrade a Raider con spiegazione
4. Audit log registra il cambiamento

---

## 6. Moderazione

### Comandi moderazione
| Comando | Permessi | Descrizione |
|---------|----------|-------------|
| `/warn` | Officer+ | Warna un membro (registrato nel DB) |
| `/warnings` | Officer+ | Visualizza i warn di un membro |
| `/clearwarn` | Admin | Rimuove un warn |
| `/mute` | Officer+ | Timeout un membro |
| `/unmute` | Officer+ | Rimuove timeout |
| `/purge` | Officer+ | Elimina messaggi bulk |
| `/lockdown` | Admin | Blocca un canale |
| `/slowmode` | Officer+ | Imposta slowmode |

### Automod
Il bot ha automod integrato:
- Filtro parole proibite (configurabile da dashboard)
- Anti-spam (rate limit messaggi)
- Anti-raid (join detection)
- Auto-role assegnamento

Configura automod da: dashboard → **Automod**

### Regole ban
1. **Warn** (3 max prima di azioni gravi)
2. **Timeout** (1h, 24h, 7gg scalabili)
3. **Kick** (ultimo avviso)
4. **Ban** (decisione Owner/Consigliere, con audit log)

---

## 7. Dashboard admin

Accedi a **[bloodswow.it/dashboard](https://bloodswow.it/dashboard)** con Discord OAuth.

### Pagine admin disponibili
| Pagina | Funzione |
|--------|----------|
| **Members** | Lista membri, ruoli, stats, ban/kick |
| **Moderation** | Warn, mute, ban, automod |
| **Raid** | Config raid, roster, eligibilità, loot |
| **Events** | Crea/gestisci eventi community |
| **Giveaways** | Crea/gestisci giveaway |
| **Polls** | Crea/gestisci sondaggi |
| **Games** | Aggiungi/gestisci giochi supportati |
| **Custom Commands** | Comandi personalizzati |
| **Scheduled Messages** | Messaggi programmati |
| **Level Rewards** | Ricompense livello |
| **XP Events** | Eventi XP moltiplicatore |
| **Badges** | Badge personalizzati |
| **Tags** | Guide salvate (`/tag`) |
| **Feedback** | Feedback membri |
| **Suggestions** | Suggerimenti membri |
| **Audit Log** | Log azioni admin |
| **Discord Logs** | Log eventi Discord |
| **Settings** | Configurazione gilda |
| **Analytics** | Statistiche community |
| **Health** | Stato bot e servizi |
| **Search** | Ricerca membri/messaggi |
| **Starboard** | Migliori messaggi |
| **LFG** | Sessioni LFG attive |
| **Reminders** | Promemoria programmati |
| **Birthdays** | Compleanni membri |

### Sicurezza dashboard
- Login tramite Discord OAuth2 (state validation)
- JWT cookie httpOnly + secure + sameSite=lax
- Tutte le route API protette: `requireAuth` → `requireGuildMember` → `requireAdmin`
- Rate limiting: 100 req/15min API, 5 req/15min auth
- Audit log: ogni azione admin registrata nel DB

---

## 8. Gestione Discord

### Struttura categorie
Il Discord è organizzato in:
- **Area Iniziale**: regolamento, benvenuto, comandi bot, selezione giochi, invito
- **Bloods Info**: news, comunicazioni, annunci, FAQ, WhatsApp, invito WoW
- **Bloods PvE**: raid log, roster, tattiche, banca, presentazioni, prenotazioni
- **Bloods PvP**: prenotazioni RBG, arena LFG, eventi PvP
- **Mythic+**: keys settimanali, LFG mito, eventi M+
- **Community Hub**: updates, changelog, LFG, suggerimenti, chat pubblica
- **Streaming Zone**: live alert, overlay, live room
- **Assistenza**: ticket, assistenza vocale
- **Forum**: staff chat, log staff, modifiche
- **Game categories**: una per gioco (WoW, Valorant, LoL, ecc.)

### Permessi canali
- `@everyone`: `ViewChannel` negato su tutto tranne canali pubblici
- Ogni gioco: `ViewChannel` permesso solo per il ruolo del gioco
- Canali staff: visibili solo per Officer+
- Bot: Administrator (necessario per gestione canali/ruoli)

### Aggiungere un nuovo gioco
1. Dashboard → **Games** → Add Game
2. Oppure comando: `/game add` (richiede Manage Server)
3. Il bot crea automaticamente: ruolo, categoria, canali standard
4. Re-run `/rolepanel` per aggiornare il pannello self-role

---

## 9. Operazioni manuali su Discord

Queste operazioni **non** possono essere automatizzate dal bot:

1. **Riorganizzare categorie** (drag & drop nell'app Discord)
2. **Modificare permessi manualmente** su canali specifici
3. **Creare canali vocali stage** per eventi speciali
4. **Configurare Ticket Tool** (bot esterno per i ticket)
5. **Impostare emoji del server**
6. **Gestire integrazioni** (YouTube, Twitch, etc.)
7. **Configurare server boost** e perks

---

## 10. Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| Il bot non risponde | Controlla `pm2 status` — se down, `pm2 restart bloods-hub-bot` |
| Comandi slash non appaiono | Esegui `npm run deploy:commands` |
| Dashboard non carica | Verifica build: `npm run dashboard:build` + restart PM2 |
| Errore API 401 | Token JWT scaduto — fai logout/login |
| Errore API 403 | Permessi insufficienti — verifica ruolo Discord |
| BP non aggiornati | Il bot calcola BP post-raid. Forza update da dashboard → Raid |
| Raid roster vuoto | Configura requisiti: `/raidreq` o dashboard → Raid → Config |
| Warcraft Logs non sincronizza | Verifica credenziali WCL in `.env` (WCL_CLIENT_ID/SECRET) |
