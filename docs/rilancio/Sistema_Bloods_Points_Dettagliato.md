# Sistema Bloods Points (BP) — Documentazione Dettagliata

> Sistema loot ufficiale della gilda Bloods, gestito tramite bot Discord. Sostituisce il DKP tradizionale con un sistema personalizzato basato sulla partecipazione alle attività di gilda.
> Versione 1.0 — Rilancio Midnight. Da pubblicare in `#loot-bloods-points` e sul sito web. Midnight Season 2 è live (patch 12.1), raid corrente: The Venomous Abyss.

---

## 1. Principi del sistema

- **Partecipazione = valore.** Più partecipi alle attività di gilda, più BP accumuli, più priorità hai sul loot.
- **Trasparenza.** Tutti i BP sono consultabili in tempo reale via bot. Nessun dato nascosto.
- **Progress first.** Il loot va chi fa progredire la gilda (raider mitici hanno priorità su upgrade progress).
- **Soft-progress.** Nessuno viene escluso dal loot, ma chi partecipa di più ha più chance.
- **No pay-to-win.** I BP non si comprano, si guadagnano solo con la partecipazione.

---

## 2. Tabella punti BP

### 2.1 Raid

| Evento | BP assegnati | Note |
|--------|-------------|------|
| Presenza raid (online all'orario) | +10 | Per ogni raid a cui sei presente |
| Puntualità (online 15 min prima) | +5 | Bonus cumulabile con presenza |
| Kill boss Normal | +5 | Per boss |
| Kill boss Heroic | +10 | Per boss |
| Kill boss Mitico | +20 | Per boss |
| First kill Normal (progress gilda) | +15 | Bonus una tantum per boss |
| First kill Heroic (progress gilda) | +25 | Bonus una tantum per boss |
| First kill Mitico (progress gilda) | +50 | Bonus una tantum per boss |
| Wipe night (progress senza kill) | +8 | Per serata di progress con ≥10 wipe |
| Recupero assenza comunicata | 0 | Nessun BP ma nessuna penalità |
| No-show (assenza non comunicata) | -15 | Penalità, vale per raider mitico |

### 2.2 Mythic+

| Evento | BP assegnati | Note |
|--------|-------------|------|
| M+ gilda completata (key +6/+8) | +5 | Con almeno 3 gildani nel gruppo |
| M+ gilda completata (key +9/+10) | +8 | Con almeno 3 gildani |
| M+ gilda completata (key +11 e oltre) | +12 | Con almeno 3 gildani |
| M+ push night (1 sera dedicata) | +5 | Presenza alla push night |

### 2.3 PvP

| Evento | BP assegnati | Note |
|--------|-------------|------|
| Presenza PvP night (RBG) | +8 | Per ogni PvP night |
| Win RBG gilda | +6 | Per vittoria |
| Partecipazione torneo PvP interno | +15 | Per partecipazione al torneo mensile |
| Win torneo PvP interno | +25 | Per chi vince il torneo |
| Arena gilda (3+ game sera) | +5 | Con almeno 1 gildano |

### 2.4 Eventi community

| Evento | BP assegnati | Note |
|--------|-------------|------|
| Open House settimanale (presenza) | +5 | Per sabato Open House |
| Evento community (transmog, screenshot, alt day) | +8 | Per evento |
| Mentorship (come mentor) | +10 | Per sessione di mentorship 1-to-1 |

### 2.5 Bonus stagionali

| Evento | BP assegnati | Note |
|--------|-------------|------|
| Fine tier (clear 8/8 M) | +100 | Per tutto il roster mitico |
| Fine tier (clear 8/8 H) | +50 | Per tutto il roster raid |
| Anno gilda (anniversario 20/09) | +30 | Per tutti i membri attivi |

---

## 3. Soglie BP per claim loot

- **Soglia minima per partecipare al roll:** 50 BP.
- **Soglia minima per claim diretto (senza roll):** 200 BP.
- **Sotto 50 BP:** non puoi claimare loot, ma puoi riceverlo se nessuno lo claima (loot council fallback).

### Come funziona il roll (sistema reale del bot)

1. Boss muore → loot drop.
2. Loot Master (RL) usa `/loot start [item] [min_bid] [max_bid]` per avviare il roll.
3. I player interessati usano `/loot roll [item_id] [bid]` entro la finestra.
4. Il bot calcola lo score: `score = roll * (1 + bid / 50)`
   - `roll` = numero casuale (1-100)
   - `bid` = BP che il player decide di spendere
5. Vince chi ha lo score più alto.
6. BP spesi: il `bid` viene sottratto dal saldo del vincitore.
7. RL chiude con `/loot close`, bot registra il vincitore.
8. `/loot recap` per rivedere lo storico.

> **Nota:** il sistema unisce fortuna (roll) e investimento (bid BP). Spendere più BP aumenta le chance ma non garantisce la vittoria. Strategia: bid alto su item che ti serve molto, bid basso su item marginali.

---

## 4. Costo BP per item

| Tipo item | Costo BP | Note |
|-----------|---------|------|
| Item Normal | 30 | Per pezzo |
| Item Heroic | 60 | Per pezzo |
| Item Mitico | 100 | Per pezzo |
| Token set (Normal) | 40 | Per token |
| Token set (Heroic) | 70 | Per token |
| Token set (Mitico) | 120 | Per token |
| Weapon/Trinket (upgrade alto) | +20 | Surcharge per item high-demand |
| Off-spec item | 50 | Solo se nessuno main-spec claima |

> Il costo BP viene sottratto dal saldo del player che vince il loot.

---

## 5. Tier priority (priorità loot)

Quando più player claimano lo stesso item, la priorità è:

1. **Raider Mitico** (roster 20) — main spec, upgrade progress.
2. **Raider** (roster heroic) — main spec.
3. **@Social** — main spec, solo se nessun raider claima.
4. **Off-spec** — chiunque, solo se nessun main-spec claima.

**Eccezione progress:** se un item è un upgrade chiave per un boss mitico in progress, il RL può dichiarare "progress priority" e l'item va al player designato dal RL (anche con BP minori). Uso limitato e trasparente.

---

## 6. Regole decay

- **Decay mensile:** -20% BP se presenza raid <50% nel mese (per raider mitico/raider).
- **Decay inattività:** se un player è inattivo >30 giorni senza avviso, i BP vengono azzerati al momento del kick.
- **Decay cambio tag:** se un Raider Mitico torna Raider (drop requisiti), perde il 30% dei BP (riflette il cambio di priorità).
- **Nessun decay per @Social** (non hanno obblighi di presenza).

---

## 7. Off-spec priority

- **Main-spec ha sempre priorità su off-spec**, indipendentemente dai BP.
- Off-spec claim possibile solo se:
  - Nessun main-spec claima entro i 30 secondi.
  - Il player ha ≥50 BP.
  - Costo off-spec: 50 BP (fisso, indipendente dalla difficoltà).
- Un player può cambiare main-spec una volta per tier (comunicando all'Officer), con reset dei BP off-spec accumulati.

---

## 8. Comandi bot Bloods Points (bot reale)

> Il bot Bloods Hub Bot gestisce BP e loot con comandi slash. Documentazione completa: `Manuale_Bot_Bloods_Hub.md`.

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
| `/bp roster add @user` | Admin/RL | Aggiungi al roster raid |
| `/bp roster remove @user` | Admin/RL | Rimuovi dal roster raid |
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

## 9. Esempi pratici

### Esempio 1: loot Normal, 2 claimer
- Boss Normal muore, drop item DPS.
- Player A (Raider Mitico, 320 BP) claima.
- Player B (Raider, 180 BP) claima.
- Entrambi sopra soglia 50 BP.
- Tier priority: Player A (Raider Mitico) > Player B (Raider).
- Player A vince, costo 30 BP, nuovo saldo 290 BP.

### Esempio 2: loot Mitico, 3 claimer
- Boss Mitico muore, drop weapon.
- Player A (Raider Mitico, 400 BP) claima.
- Player B (Raider Mitico, 380 BP) claima.
- Player C (Raider Mitico, 350 BP) claima.
- Tutti Raider Mitico, stessa tier priority.
- Differenza tra A e B: 20 BP (<50) → roll.
- A rolla 78, B rolla 45 → A vince.
- Costo: 100 BP (Mitico) + 20 BP (weapon surcharge) = 120 BP.
- Nuovo saldo A: 280 BP.

### Esempio 3: off-spec claim
- Boss Heroic muore, drop item tank.
- Nessun main-spec tank claima (i tank hanno già l'item o non è upgrade).
- Player D (DPS, 150 BP) claima off-spec (ha un alt tank).
- Costo off-spec: 50 BP.
- Nuovo saldo D: 100 BP.

### Esempio 4: progress priority
- Boss Mitico in progress, drop trinket chiave per healer.
- Player E (Healer, 200 BP) e Player F (Healer, 280 BP) claimano.
- RL dichiara "progress priority" perché il trinket di E è più impact per il boss in progress.
- E vince nonostante BP minori. Trasparenza: RL spiega in chat il motivo.

---

## 10. Edge cases

- **Player nuovo (0 BP):** non può claimare fino a 50 BP. Primo raid: +15 BP (presenza +10, puntualità +5). Primo kill: +5-20 BP. Dopo 2-3 raid ha la soglia.
- **Player che entra a raid in corso:** +5 BP (mezza presenza), niente bonus puntualità.
- **Disconnect durante raid:** se rientra entro 10 min, presenza piena. Se non rientra, mezza presenza.
- **Loot non claimato da nessuno:** va in banca gilda o disincanto (DE) per materiali.
- **Disputa su claim:** il Loot Master decide, possibile appeal post-raid con Officer.

---

## 11. Amministrazione

- **Loot Master:** designato per ogni raid (1 principale + 1 backup). Non può claimare loot mentre è di turno.
- **Officer BP audit:** gli Officer possono auditare i BP di qualsiasi membro per trasparenza.
- **Log azioni bot:** tutte le transazioni BP sono loggate in `#log-azioni-bot` (canale staff).
- **Reset BP:** solo in caso di kick, cambio main-spec, o decisione Officer documentata.
- **Bug bot:** se il bot non funziona durante un raid, si usa il Piano B (loot council manuale, vedi sezione 13).

---

## 13. Piano B: Loot Council Manuale

> Se il bot BP non funziona durante un raid, il Loot Master usa questo sistema temporaneo. I BP vengono registrati manualmente post-raid quando il bot torna online.

### Procedura
1. Il Loot Master annuncia in vocale: "Bot down, loot council manuale per stasera"
2. Per ogni item drop:
   - Il Loot Master chiama: "{item_name} — chi lo vuole?"
   - I player interessati dicono in vocale: spec, upgrade % (se sanno), current item
   - Il Loot Master + RL decidono chi lo prende in base a:
     a. **Maggior upgrade** (chi ha il gear peggiore in quello slot)
     b. **Progress priority** (se l'item è chiave per il boss in progress)
     c. **Presenza** (chi c'è più spesso ha priorità)
     d. **Trial** (i trial hanno priorità bassa durante il trial)
3. Il Loot Master registra su un foglio/text: item, chi lo prende, motivo
4. Post-raid: quando il bot torna, il Loot Master inserisce i claim retroattivi

### Regole
- Zero drama sulle decisioni: il Loot Master + RL decidono, non è democratico
- Se un player non è d'accordo, parla post-raid in DM con l'Officer, non in vocale durante il raid
- Tutto viene registrato per trasparenza (post in #log-azioni-bot post-raid)
- Il sistema BP normale riprende non appena il bot torna online

---

## 12. Onboarding nuovo membro al sistema BP

1. Al primo raid, l'Officer spiega il sistema (5 min).
2. Il bot registra il player con 0 BP.
3. Il player guadagna BP dalla prima attività.
4. Documentazione completa in `#loot-bloods-points` (questo file).
5. Domande → ticket "Supporto" o chiedi al Loot Master.

---

*Il sistema BP è in versione 1.0 e può essere aggiornato dall'Owner + Founder in base al feedback della gilda. Ogni modifica viene annunciata in `#annunci` con 7 giorni di preavviso.*
