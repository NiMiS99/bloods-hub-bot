# Template Messaggi Discord — Gilda Bloods

> Messaggi pronti copia-incolla per configurare i canali Discord e l'onboarding automatico.
> Sostituisci i placeholder `[...]` prima dell'uso. Formattati per embed Discord dove indicato.

---

## 1. Messaggio di benvenuto automatico (canale `#benvenuto`)

> Configurare via bot (MEE6, Carl-bot, o bot custom Bloods). Da inviare in DM o in `#benvenuto` quando un nuovo utente entra.

```
🩸 Benvenuto nei BLOODS! 🩸

Ciao {user}! Sei entrato nel server Discord della gilda Bloods (WoW IT, Midnight).

Per diventare un membro ufficiale della gilda:

1️⃣ Apri un ticket in #apri-ticket (pulsante "Reclutamento")
2️⃣ Un Officer ti contatterà per un breve colloquio (10 min)
3️⃣ Ti assegneremo il tag in base al tuo profilo:
   • @Raider / @Raider Mitico — per il roster raid
   • @PvP — per il braccio PvP
   • @Social — per social/M+/eventi senza obblighi raid
4️⃣ Normalizziamo il tuo nickname: NOME MAIN PG - NOME ANAGRAFICO - RUOLO

📋 Nel frattempo:
• Leggi il #regolamento
• Controlla la #faq
• Presentati in #presentazioni (dopo il colloquio)

⚠️ IMPORTANTE: Discord è OBBLIGATORIO per tutte le attività di gilda. Hai tempo fino al mercoledì successivo al tuo ingresso in gilda per completare il colloquio, altrimenti verrai rimosso.

Domande? Apri un ticket "Supporto" in #apri-ticket.

Ci vediamo in raid! 🩸
```

---

## 2. Embed `#regolamento` (versione Discord)

> Postare in `#regolamento` come embed (usare bot o formato Discord embed). Sola lettura.

```
📋 REGOLAMENTO GILDA BLOODS — v3.0

🩸 CHI SIAMO
Gilda IT soft-progress con focus progress mitico, 360° con social. Fondata il 20/09/2025. Discord obbligatorio per tutte le attività.

👥 GRADI
Owner → Founder → Consigliere → Officer → Officer Reclutamento → Raid Leader → Raider → Membro

🏷️ TAG
@Tank/@Healer/@DPS | @Raider Mitico | @PvP | @Social | @Mentor

1️⃣ COMPORTAMENTO
Rispetto reciproco OBBLIGATORIO. Vietati flame, insulti, discriminazioni, tossicità. Vietato criticare/offendere un membro (anche se non online). Soft-progress = zero flame su wipe.

2️⃣ DISCORD
Obbligatorio. Nickname: NOME PG - NOME ANAGRAFICO - RUOLO. Check settimanale: chi non è riconoscibile viene rimosso. Forza maggiore? Avvisa lo Staff PRIMA del raid.

3️⃣ MYTHIC+
Discord+mic obbligatori. Consumabili+enchant+gemme pronti. No ragequit. Comunica assenze.

4️⃣ RAID
Discord+mic obbligatori. Online 15 min prima. Fiale+cibo+runa+pozioni+gemme+enchant. Iscrizione obbligatoria in #prenotazione-incursioni entro 24h prima. Loot gestito con Bloods Points (vedi #loot-bloods-points).

5️⃣ PVP
Team RBG (target 1800→2400+). Arena 2v2/3v3. PvP day: Domenica (tutto il giorno). Tornei interni mensili (premio BP). Discord+mic obbligatori. Zero flame sui loss.

6️⃣ RECLUTAMENTO
Colloquio obbligatorio con Officer (template in #faq). Assegnazione tag in base al profilo.

7️⃣ RAIDER MITICO
Tag per i 20 del roster mitico. Requisiti dettagliati in #faq. Presenza minima 75% (6/8 mese). M+ +6/+8 settimanale. Logs Warcraft Logs attivi.

8️⃣ BAN
1° richiamo: avviso. 2° richiamo: sospensione. 3° richiamo: rimozione. Inattività >30gg senza avviso: rimozione (con contatto personale prima).

✅ Entrando nei Bloods accetti INTEGRALMENTE questo regolamento.
Modifiche solo da Owner + Founder di comune accordo.

📄 Versione completa: [LINK_PDF_REGOLAMENTO]
```

---

## 3. Template `#presentazioni` (formato post nuovo membro)

> Postare in `#presentazioni` dopo il colloquio. Il nuovo membro compila questo template:

```
📋 PRESENTAZIONE

Nome PG main:
Classe/spec:
Ruolo (Tank/Healer/DPS):
BattleTag:
Da quanto gioco a WoW:
Obiettivi in gilda (raid mitico / M+ / PvP / social):
Una cosa su di me (reale):
```

**Esempio compilato:**
```
📋 PRESENTAZIONE

Nome PG main: Thrall
Classe/spec: Shaman / Enhancement
Ruolo: DPS
BattleTag: Diego#1234
Da quanto gioco a WoW: 5 anni, da Classic
Obiettivi in gilda: raid mitico + M+ push
Una cosa su di me: Faccio il barista IRL, gioco la sera dopo le 21
```

---

## 4. Formato post `#prenotazione-incursioni` (template raid signup)

> Postato dal Raid Leader (o bot) ogni settimana. Usare bot signup (Apollo, HammerTime) o formato manuale.

```
⚔️ RAID SETTIMANALE — The Venomous Abyss [DIFFICOLTÀ]

📅 Data: [GIORNO] [DATA]
🕐 Orario: 21:00 - 24:00 (online 20:45)
📍 meeting: [LUOGO_IN_GAME]
🎙️ Discord: canale 🔊 raid-1

📋 ROSTER NECESSARIO
• Tank: 2
• Healer: 4-5
• DPS: 13-14

✅ REQUISITI
• Discord + mic funzionanti
• Consumabili: fiala, codo, runa, pozioni, gemme, enchant
• Addon: DBM/BigWigs, WeakAura, Details, bot BP
• Pre-iscrizione entro 24h prima

🎟️ ISCRIZIONE
Reagisci con:
✅ Presente
❌ Assente
⏰ Ritardo (specifica orario)

⚠️ La mancata iscrizione conta come assenza.
Comunica assenze con preavviso (no ghosting).

🔗 Log precedenti: [LINK_WCL]
```

---

## 5. DM automatico post-colloquio (bot → nuovo membro)

> Inviato dal bot dopo che l'Officer ha assegnato i tag. Configurare come DM automatico.

```
🩸 Colloquio completato — Benvenuto nei BLOODS! 🩸

Ciao {user}!

Il tuo colloquio è andato a buon fine. Ecco cosa è stato configurato:

🏷️ Tag assegnati: {tags}
👤 Nickname: {nickname_normalizzato}
🎭 Ruolo: {tank/healer/dps}

PROSSIMI PASSI:
1. Presentati in #presentazioni (usa il template fissato in alto)
2. Leggi il #regolamento (se non l'hai già fatto)
3. Controlla #prenotazione-incursioni per il prossimo raid
4. Per il sistema loot, leggi #loot-bloods-points (sistema Bloods Points)
5. Per domande, apri un ticket "Supporto" in #apri-ticket

SISTEMA BLOODS POINTS:
Il tuo saldo BP parte da 0. Guadagni BP partecipando alle attività di gilda (raid, M+, PvP, eventi). Usa /bp per controllare il saldo. Soglia minima per claim loot: 50 BP.

Ci vediamo in gioco! 🩸
```

---

## 6. Template `#annunci` (annuncio generico)

> Per annunci ufficiali: nuovo raid, evento, modifica regolamento. Sola scrittura Staff.

```
📢 ANNUNCIO — [TITOLO]

📅 Data: [DATA]
👤 Da: [STAFF]

[CONTENUTO DELLA COMUNICAZIONE]

---
Per domande: apri un ticket "Supporto" in #apri-ticket.
```

### Esempio: annuncio nuovo raid
```
📢 ANNUNCIO — Avvio raid Heroic Midnight S2

📅 Data: Martedì [DATA]
👤 Da: Raid Leader

Team, come da roadmap iniziamo il progress Heroic di Midnight S2 questo martedì.

Target: 4-5/8 H entro 2 settimane.
Schedule: Mar + Gio 21:00-24:00.
Roster: chi ha fatto il clear Normal è prioritario.

Iscrizioni in #prenotazione-incursioni entro lunedì sera.
Consumabili obbligatori (kit in banca gilda per raider mitici, chiedete a [OFFICER]).

Logs attivi su Warcraft Logs: [LINK_WCL_GILDA]

Ci vediamo alle 20:45 per i buff! 🩸
```

### Esempio: annuncio evento community
```
📢 ANNUNCIO — Transmog Contest [MESE]

📅 Data: Venerdì [DATA] 21:00
👤 Da: Staff

🎨 TEMA: [TEMA_ES: "Eroe del Vuoto"]
🏆 PREMIO: 50 BP + titolo gilda "Stylista del Mese"

Regole:
• Presentati con la tua transmog più azzeccata al tema
• Screenshot in #meme-screenshot entro le 20:30
• Votazione in vocale 🔊 vocale-generale alle 21:00
• Giudici: 3 Officer (non partecipanti)

Partecipa anche se non raidi! È un evento social aperto a tutti i tag.
```

---

## 7. Template `#faq` (Q&A pronto)

> Postare in `#faq` come embed o messaggio fissato. Sola lettura.

```
❓ FAQ — BLOODS

📌 COME ENTRO NELLA GILDA?
1. Entra in Discord [LINK]
2. Apri un ticket in #apri-ticket ("Reclutamento")
3. Colloquio con Officer (10 min)
4. Ti assegniamo il tag (@Raider / @Raider Mitico / @PvP / @Social)

📌 DISCORD È OBBLIGATORIO?
Sì, per tutte le attività di gilda. Nickname: NOME PG - NOME ANAGRAFICO - RUOLO.

📌 QUALI SONO I GIORNI DI RAID?
• Raid Mitico: Mar + Gio 21:00-24:00
• PvP day: Domenica (tutto il giorno, RBG + arena)
• M+: organizzato in #lfg-mito (orari liberi)

📌 COME MI ISCRIVO AL RAID?
In #prenotazione-incursioni, reagisci al post del raid con ✅ (presente), ❌ (assente), ⏰ (ritardo). Entro 24h prima.

📌 COSA SONO I BLOODS POINTS?
Il sistema loot della gilda. Guadagni BP partecipando alle attività. Usa /bp per il saldo. Dettagli in #loot-bloods-points.

📌 COME DIVENTO RAIDER MITICO?
Soddisfa gli 11 requisiti in #faq (sezione "Requisiti Raider Mitico"). Il tag viene assegnato dal RL + Officer quando c'è slot nel roster 20.

📌 COSA SUCCEDE SE NON VENGO AL RAID SENZA AVVISARE?
È un no-show: -15 BP. 3 no-show in un mese = rimozione tag Raider Mitico + colloquio Officer.

📌 SONO UN PLAYER SOCIAL, POSSO PARTECIPARE AI RAID?
Sì! I @Social possono partecipare al raid quando ci sono slot liberi nel roster (Mar/Gio). Per il raid Mitico fisso serve il tag @Raider Mitico (requisiti in #faq).

📌 FACCIO PVP, COME MI ORGANIZZO?
Unisciti al PvP day domenicale (RBG + arena, tutto il giorno). Per il team RBG competitivo, ticket "Reclutamento PvP" in #apri-ticket.

📌 COMA FUNZIONA IL SISTEMA DI BAN?
1° richiamo: avviso. 2°: sospensione. 3°: rimozione. Inattività >30gg senza avviso: rimozione (con contatto personale prima).

📌 COME RICHIESTO CRAFT DALLA BANCA GILDA?
Apri un ticket "Supporto" in #apri-ticket specificando: item, professione necessaria, materiali che hai/serve. Un Officer ti collega al crafter giusto.

📌 COME DIVENTO MENTOR?
I Raider Mitici possono diventare @Mentor affiancando membri @Social che vogliono salire al roster raid. Contatta un Officer.

Altre domande? Apri un ticket "Supporto"! 🩸
```

---

## 8. Messaggio `#apri-ticket` (pannello ticket bot)

> Configurare con bot ticket (Ticket Tool, Carl-bot). Messaggio fissato con pulsanti.

```
🎫 TICKET — BLOODS

Apri un ticket per:
• Reclutamento Raider (per il roster raid)
• Reclutamento PvP (per il braccio PvP)
• Reclutamento Social (per social/M+/eventi)
• Supporto (domande, craft, problemi)

Un Officer ti risponderà il prima possibile.
Non aprire più ticket per lo stesso motivo. 🩸

[PULSANTE: Reclutamento Raider]
[PULSANTE: Reclutamento PvP]
[PULSANTE: Reclutamento Social]
[PULSANTE: Supporto]
```

---

## 9. Messaggio `#loot-bloods-points` (fissato)

> Postare in cima al canale come messaggio fissato.

```
💰 BLOODS POINTS — SISTEMA LOOT

Il sistema loot dei Bloods è basato sui Bloods Points (BP), gestiti dal bot Discord.

📌 COME FUNZIONA
• Guadagni BP partecipando alle attività di gilda (raid, M+, PvP, eventi)
• Usi i BP per claimare loot durante i raid
• Soglia minima claim: 50 BP
• Dettagli completi: [LINK_PDF_SISTEMA_BP]

📌 COMANDI BOT
• /bp — il tuo saldo
• /bp leaderboard — top 10 gilda
• /bp history — le tue transazioni
• /bp claim [item] — claima loot durante un raid (30 sec)

📌 REGOLE CHIAVE
• Main-spec > off-spec (sempre)
• Tier priority: Raider Mitico > Raider > Social > off-spec
• Costo item: Normal 30 BP, Heroic 60 BP, Mitico 100 BP
• Decay mensile -20% se presenza <50% (raider)

📌 CHI È IL LOOT MASTER?
Designato per ogni raid dal RL. Non può claimare mentre è di turno.

Domande? Ticket "Supporto" in #apri-ticket. 🩸
```

---

## 10. Messaggio `#benvenuto` (fissato, canale)

> Postare in `#benvenuto` come messaggio fissato (sola lettura).

```
🩸 BLOODS — GILDA WOW IT — MIDNIGHT

Benvenuto nel server Discord della gilda Bloods!

Siamo una gilda IT soft-progress con focus progress mitico, 360° con social. Fondata il 20/09/2025.

🚀 PER ENTRARE NELLA GILDA:
1. Apri un ticket in #apri-ticket (pulsante "Reclutamento")
2. Colloquio con Officer (10 min)
3. Ti assegniamo il tag: @Raider / @Raider Mitico / @PvP / @Social

📋 DA LEGGERE:
• #regolamento — regole della gilda
• #faq — domande frequenti
• #loot-bloods-points — sistema loot

📅 ATTIVITÀ SETTIMANALI:
• Raid Mitico: Mar + Gio 21:00-24:00
• PvP day: Domenica (tutto il giorno, RBG + arena)
• Open House: Sab 21:00 (aperto a non-gildati)

⚠️ Discord è OBBLIGATORIO per tutte le attività di gilda.

Benvenuto nella famiglia Bloods! 🩸
```
