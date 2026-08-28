# Guida Addon e Configurazione — Gilda Bloods

> Setup pratico degli addon per chi fa raid con i Bloods. Niente di complicato: installi, configuri, entri in raid.
> Obbligatorii per i Raider Mitici, consigliati per tutti. Se hai dubbi chiedi in `#support-tecnico` su Discord.

---

## 1. Come installare gli addon

### Metodo 1 — CurseForge (consigliato)
1. Scarica l'app **CurseForge** da https://www.curseforge.com/wow
2. Login (puoi usare account CurseForge o Twitch).
3. Seleziona **World of Warcraft → Retail**.
4. Cerca l'addon → **Install**.
5. Aggiornamenti gestiti in automatico dall'app.

### Metodo 2 — Installazione manuale
1. Scarica lo `.zip` dell'addon (da CurseForge, WoWInterface, GitHub).
2. Estrai nella cartella `World of Warcraft\_retail_\Interface\AddOns`.
3. La cartella dell'addon deve contenere un file `.toc` (es. `DBM-Core\DBM-Core.toc`).
4. Avvia WoW → Schermata personaggio → **AddOns** (basso sx) → assicurati che sia spuntato.
5. **Carica addon non firmati: ON** (se l'addon non è firmato da Blizzard).

> **Nota:** dopo ogni patch di WoW, aggiorna gli addon prima di entrare in raid. Un addon non aggiornato è la causa #1 di crash e bug.

---

## 2. Addon OBBLIGATORI per il raid

### 2.1 DBM o BigWigs (boss mods)
Uno dei due, non entrambi. Avvisi su timer, meccaniche, ability dei boss.
- **DBM (Deadly Boss Mods)** — più popolare, più "urla", più opzioni.
- **BigWigs Bossmods** — più pulito, meno spam, preferito da molti Raider Mitici.

**Configurazione DBM:**
- `/dbm` → **Options**.
- **Timer position:** spostali in alto al centro o dove ti fanno comodo (non sopra il frame del boss).
- **Timer style:** "Bar" con colore per tipo (cast rosso, meccanica gialla).
- **Voice alert:** attiva una voce (es. inglese) — aiuta se non guardi sempre lo schermo.
- **Range radar:** ON per i boss con meccaniche di distanza.
- **Disabilita avvisi non essenziali:** se DBM urla troppo, spegni i "spam" non critici.

**Configurazione BigWigs:**
- `/bw` → opzioni simili, più pulite di default.
- **Emphasize:** attiva per le ability chiave (flash più visibile).

### 2.2 WeakAuras
Il tool più potente di WoW per tracking meccaniche, cooldown, debuff. Vedi guida dedicata: `WeakAura_Collection_Bloods.md`.
- Installa **WeakAuras** + **WeakAuras Companion** (app desktop per auto-update delle stringhe da Wago.io).
- Configurazione minima: `/wa` → importa le stringhe della gilda (vedi guida WA).

### 2.3 Details! (damage/healing meter)
Meter per DPS, HPS, interrupt, dispel, damage taken. Obbligatorio per il review post-raid.
- `/details` → **Options**.
- **Window position:** trascina dove ti serve (basso dx di default).
- **Mode:** "Damage" di default, switcha con le freccette in alto alla finestra.
- **Segments:** "Current Fight" durante il pull, "Overall" per la sessione.
- **Show in combat:** ON (vedi i numeri mentre fai il boss).
- **Privacy:** NON postare meter in chat durante il raid senza permesso del RL. Details serve per auto-analisi, non per flame.

### 2.4 Bloods Points bot (Discord, non in-game)
Non è un addon di WoW. È il **bot Discord** che traccia i punti presenza/loot della gilda.
- Vedi `Sistema_Bloods_Points_Dettagliato.md` per setup e comandi.
- Assicurati di avere il ruolo corretto su Discord per essere tracciato.

---

## 3. Addon UI CONSIGLIATI

### 3.1 Plater (nameplates)
Nameplate avanzato: colori per debuff, cast bar visibile, marker per interrupt.
- `/plater` → **Options**.
- Importa un profile condiviso in `#support-tecnico` (se disponibile) o usa il default.
- **Cast bar color:** rosso per cast interrompibili, grigio per non-interrompibili.
- **Nameplate size:** regolato per vedere i mob in pull senza affollare lo schermo.

### 3.2 ElvUI o base UI
- **ElvUI** — UI completa, tutto in uno (unit frames, action bars, minimap). Se non sai cosa usare, ElvUI è la scelta sicura.
  - `/ec` → configurazione guidata al primo avvio.
  - Importa un profile della gilda se condiviso.
- **Base UI** — se preferisci l'UI di default, va benissimo. Aggiungi solo i singoli addon che ti servono (unit frames, action bars).

> Non c'è obbligo di ElvUI. L'importante è che la tua UI sia leggibile e che tu veda timer, debuff, cooldown.

### 3.3 GTFO
Avviso sonoro quando sei in una meccanica che ti fa danno (fuoco, pozze, zone pericolose).
- Installa e basta. Configurazione minima: `/gtfo` → test audio.
- **Volume:** assicurati che si senta sopra la voce di Discord.
- Non sostituisce DBM, ma aiuta quando sei concentrato su altro e non vedi la pozza sotto i piedi.

---

## 4. Advanced Combat Logging (per Warcraft Logs)

OBBLIGATORIO per i Raider Mitici, serve per registrare i log che poi vengono uploadati su Warcraft Logs (vedi `Guida_Warcraft_Logs.md`).

1. In gioco: **Esc → Sistema → Rete**.
2. **Advanced Combat Logging:** → **ON**.
3. Verifica dopo ogni patch di WoW (a volte si resetta).
4. Senza questo, il log non è completo e non si può fare upload corretto.

> Se sei l'uploader designato per il raid, controlla questo PRIMA di ogni pull. Un log senza Advanced Combat Logging è inutile.

---

## 5. Checklist setup Raider

- [ ] CurseForge installato (o metodo manuale funzionante).
- [ ] DBM o BigWigs installato e configurato.
- [ ] WeakAuras + Companion installati, stringhe gilda importate.
- [ ] Details! installato, finestra posizionata.
- [ ] Plater installato (consigliato).
- [ ] ElvUI o base UI configurata e leggibile.
- [ ] GTFO installato e audio testato.
- [ ] Advanced Combat Logging ON.
- [ ] Bot Bloods Points attivo su Discord.
- [ ] Tutti gli addon aggiornati all'ultima versione.

---

## 6. FAQ veloce

**Devo usare tutti questi addon?**
Per il raid mitico sì (DBM/BigWigs, WeakAuras, Details! sono obbligatori). Plater, ElvUI, GTFO sono consigliati ma non obbligatori.

**ElvUI rompe il mio UI di default?**
ElvUI sostituisce l'UI di default. Se vuoi tenere quella base, non installare ElvUI e usa addon singoli.

**Dove trovo le stringhe WeakAuras della gilda?**
Il RL posta le stringhe boss-specific in `#tattiche` prima di ogni boss. Le WA generiche sono in `WeakAura_Collection_Bloods.md`.

**Un addon non funziona dopo una patch.**
Aggiorna con CurseForge. Se persiste, disattiva gli altri addon per isolare il problema. Chiedi in `#support-tecnico`.

---

*Guida Addon v1.0 — Rilancio Midnight. Aggiornamenti al variare degli addon obbligatori o delle policy gilda.*
