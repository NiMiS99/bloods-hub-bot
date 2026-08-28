# Guida Warcraft Logs (WCL) — Gilda Bloods

> Warcraft Logs è OBBLIGATORIO per i Raider Mitici e fortemente consigliato per tutti i Raider. Questa guida spiega setup, upload, lettura e uso per il miglioramento del roster.

---

## 1. Cos'è Warcraft Logs e perché lo usiamo

Warcraft Logs (WCL) è il tool standard del mondo WoW per registrare e analizzare i combat log dei raid, M+ e PvP. Permette di:

- Vedere DPS/HPS ranking di ogni player per ogni boss.
- Analizzare i wipe (chi è morto, quando, perché).
- Controllare meccaniche (chi ha preso il debuff, chi non ha interrotto, chi ha usato il CD al momento giusto).
- Tracciare il progress gilda (kill timeline, ranking server IT).
- Confrontare performance tra player della stessa classe/spec.

**Perché è obbligatorio per i Raider Mitici:**
- Permette al RL di dare feedback basato su dati, non su impressioni.
- Aiuta a identificare i bottleneck (DPS troppo basso, healer OOM, meccaniche mancate).
- È la base per la selezione del roster mitico (vedi `Requisiti_Raider_Mitico.md`).
- Serve per il reclutamento (player esterni vedono i nostri log e capiscono il livello).

---

## 2. Setup — Per il singolo player

### 2.1 Creazione account WCL
1. Vai su https://www.warcraftlogs.com
2. Crea un account (gratis, account premium opzionale per feature extra).
3. Collega il tuo Battle.net (per auto-import dei personaggi).

### 2.2 Installazione del client upload
1. Scarica **Warcraft Logs Uploader** (client desktop) dal sito.
2. Installa e avvia.
3. Login con il tuo account WCL.
4. Configura il path del combat log di WoW:
   - Default: `C:\Program Files (x86)\World of Warcraft\_retail_\Logs\WoWCombatLog.txt`
   - Abilita "Advanced Combat Logging" in WoW: Esc → Sistema → Rete → "Advanced Combat Logging" ON.

### 2.3 Addon in-game (opzionale ma consigliato)
- **GuildWCLLogUploader** (se la gilda usa upload centralizzato, vedi sezione 3).
- **Details!** — già obbligatorio per i Raider Mitici, integra export log.
- **WCL Checker** — per vedere il tuo ranking in-game.

---

## 3. Setup — Per la gilda (upload centralizzato)

### 3.1 Chi fa upload
- **Loot Master** (o un Officer designato) fa upload dopo ogni raid.
- Un solo uploader per raid evita log duplicati.
- L'uploader deve avere i permessi sulla pagina gilda WCL.

### 3.2 Creazione pagina gilda WCL
1. Account WCL → "Create Guild" (o claim se esiste già).
2. Nome gilda: **Bloods**
3. Server: Pozzo/Nemesis
4. Region: EU
5. Aggiungi gli Officer come admin della pagina gilda.

### 3.3 Configurazione upload
1. WCL Uploader → Settings → Guild → seleziona "Bloods".
2. Ogni upload va nella pagina gilda, non in quella personale.
3. Auto-upload: possibile configurare upload automatico post-raid (consigliato).

### 3.4 Log pubblici vs privati
- **Log raid gilda: PUBBLICI** (per trasparenza e recruiting).
- **Log progress mitico in corso: PRIVATI** fino al first kill, poi pubblici (evitare spoiler tattiche ad altre gilde).
- **Log M+ gilda: pubblici.**
- **Opt-out:** un player può chiedere che i suoi log siano anonimizzati (rari casi, gestito via Officer).

---

## 4. Come leggere i log

### 4.1 Dashboard raid
Dopo un raid, il log mostra:
- **Kill/wipe count** per boss.
- **Durata** dei pull.
- **Roster** presente.

### 4.2 DPS/HPS ranking
- Tab "Damage Done" → DPS per ogni player, per boss.
- Tab "Healing Done" → HPS per ogni player.
- Confronta con il **rankings** (percentile globale): grigio < verde < blu < viola < rosa < arancione (99%).
- Target Raider Mitico: **blu+ (75%+)** su boss mitici, **viola+ (95%+)** su boss heroic.

### 4.3 Wipe analysis
- Tab "Deaths" → chi è morto, quando, causa.
- Tab "Buffs/Debuffs" → chi ha preso un debuff letale, chi non l'ha dispelato.
- Tab "Casts" → chi ha usato (o non usato) un CD chiave.
- **Funzione "Replay"** → rivedi il pull secondo per secondo (posizione player, meccaniche).

### 4.4 Mechanic check (esempi)
- **Interrupt:** tab "Casts" → filtra per "Interrupt", vedi chi ha interrotto e chi no.
- **Dispels:** tab "Dispels" → chi ha dispelato, quanti dispel mancati.
- **Positioning:** funzione "Replay" → mappa heatmap, vedi chi era fuori posizione.
- **CD usage:** tab "Casts" → filtra per CD del player, vedi se li ha usati al momento giusto.

---

## 5. Come usare i log per il review

### 5.1 Post-raid debrief (15 min, come da roadmap Fase 3)
1. RL apre il log dell'ultimo wipe.
2. Identifica 2-3 punti chiave (es. "DPS basso su boss X", "meccanica Y mancata da 3 player").
3. Condivide screenshot/clips in `#tattiche`.
4. Piano per la prossima sera (cosa correggere).

### 5.2 Feedback 1-to-1 ( Raider Mitico)
- Officer/RL contatta il player in privato (non in chat pubblica, per evitare call-out).
- Condivide il link al log specifico.
- Feedback costruttivo: "Qui il tuo DPS è basso rispetto al tuo gear, guarda questo confronto con un player della tua stessa spec [link]. Proviamo a cambiare X."
- Follow-up dopo 2 raid per vedere il miglioramento.

### 5.3 Selezione roster mitico
- I log sono uno dei criteri per la selezione (vedi `Requisiti_Raider_Mitico.md`).
- Confronto performance tra player della stessa classe/spec.
- Non è l'unico criterio (presenza, attitudine, copertura ruoli contano), ma è oggettivo.

### 5.4 Tracking progress gilda
- Pagina gilda WCL → "Progress" → timeline dei kill (Normal → Heroic → Mitico).
- Ranking server IT: dove siamo rispetto alle altre gilde IT.
- Obiettivo: top 10 gilde IT sul tier (realistico con roster solido).

---

## 6. Workflow raid con WCL (riepilogo)

1. **Prima del raid:** tutti hanno Advanced Combat Logging ON.
2. **Durante il raid:** WoW registra il combat log in automatico.
3. **Fine raid:** Loot Master apre WCL Uploader → seleziona la sessione → upload.
4. **Post-upload:** link del log postato in `#log-raid` (bot auto-post o manuale).
5. **Debrief (15 min):** RL analizza il log con il roster.
6. **Giorno dopo:** feedback 1-to-1 per chi ne ha bisogno.

---

## 7. Comandi e link utili

| Cosa | Link/Comando |
|------|-------------|
| Sito WCL | https://www.warcraftlogs.com |
| Client upload | https://www.warcraftlogs.com/client/download |
| Pagina gilda Bloods | [LINK_PAGINA_GILDA_WCL] (da creare) |
| Analisi M+ | https://www.warcraftlogs.com/mythic-plus/ |
| Confronto player | https://www.warcraftlogs.com/character/eu/[realm]/[name] |
| WCL Analyzer (tool esterno) | https://wowanalyzer.com (analisi automatica per spec) |

---

## 8. FAQ WCL

**Devo pagare WCL?**
No, l'account base è gratis. Il premium (upload più veloci, più storage) è opzionale e non richiesto per i Raider Mitici.

**Cosa succede se dimentico di attivare Advanced Combat Logging?**
Il log non viene registrato correttamente. Riattivalo prima del prossimo raid. Se sei l'uploader designato, è un problema — controlla sempre prima del raid.

**Posso vedere i log di un player che non è nei Bloods?**
Sì, se i suoi log sono pubblici. Utile per valutare un candidato al reclutamento (chiedi il suo WCL link durante il colloquio).

**I log PvP sono su WCL?**
WCL registra anche PvP, ma per arena/RBG si usano più spesso tool dedicati (es. Luda per PvP). Per i tornei interni usiamo screenshot del rating.

**Il RL può usare i log per "punire" un player?**
No. I log servono per migliorare, non per punire. Il regolamento vieta le critiche offensive (1.c1-c6). Il feedback è costruttivo e privato. Tossicità sui log = violazione regolamento.

---

## 9. Checklist setup Raider Mitico WCL

- [ ] Account WCL creato.
- [ ] Client WCL Uploader installato.
- [ ] Advanced Combat Logging ON in WoW.
- [ ] Details! installato e configurato.
- [ ] Pagina gilda WCL "Bloods" seguita.
- [ ] (Per uploader) Permessi sulla pagina gilda.
- [ ] (Per uploader) Path combat log configurato.

---

*Guida WCL v1.0 — Rilancio Midnight. Aggiornamenti in caso di cambiamenti al client WCL o alle policy gilda.*
