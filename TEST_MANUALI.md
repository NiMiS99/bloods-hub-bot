# Test Manuali — Bloods Hub Bot

> **Chi:** Amministratore Discord
> **Quando:** Dopo ogni deploy o modifica importante
> **Come:** Esegui ogni test su Discord e segna con ✅ o ❌

---

## 1. Onboarding

### 1.1 Pannello onboarding
- [ ] Esegui `/onboarding post` in un canale admin
- **Risultato atteso:** Pannello con lista comandi postato nel canale

### 1.2 DM onboarding
- [ ] Esegui `/onboarding dm @utente-test`
- **Risultato atteso:** L'utente riceve un DM con la guida ai comandi

### 1.3 Flusso verifica nuovo membro
- [ ] Fai entrare un account di test nel server
- **Risultato atteso:**
  - Auto-assegnato ruolo "Non Verificato"
  - Vede solo #Benvenuto + #Regolamento
  - Cliccando "Verifica" → riceve "Membro della community" → sblocco server

---

## 2. Level-up

### 2.1 Annuncio level-up
- [ ] Fai scrivere un utente abbastanza da livellare (o usa un utente a basso livello)
- **Risultato atteso:** Messaggio in #annunci-gilda con formato:
  `🎉 **{user}** ha raggiunto il livello **{level}**! 🩸`

### 2.2 Config level-up
- [ ] Esegui `/config view`
- **Risultato atteso:** Mostra level_up_channel = #annunci-gilda e il template messaggio

---

## 3. Feedback

### 3.1 Aprire feedback
- [ ] Esegui `/feedback` con titolo e descrizione
- **Risultato atteso:**
  - Thread creato automaticamente
  - Messaggio di conferma con ID feedback

### 3.2 Dashboard feedback
- [ ] Apri dashboard → Segnalazioni Admin
- **Risultato atteso:** Il feedback appare nella lista con status "open"

---

## 4. Dashboard — Nuove pagine

### 4.1 Tags
- [ ] Crea un tag con `/tag add test Questo è un test`
- [ ] Apri dashboard → Tag
- **Risultato atteso:** Il tag "test" appare nella lista con 0 usi

### 4.2 Birthdays
- [ ] Imposta un compleanno con `/birthday set 15/03`
- [ ] Apri dashboard → Compleanni
- **Risultato atteso:** Il compleanno appare ordinato per mese/giorno

### 4.3 Reminders
- [ ] Crea un promemoria con `/remind 1m Test promemoria`
- [ ] Apri dashboard → Promemoria
- **Risultato atteso:** Il promemoria appare nella lista
- [ ] Aspetta 1 minuto — verifica che il bot recapiti il promemoria
- [ ] Torna in dashboard → Promemoria — verifica che sia sparito o marcato come inviato

### 4.4 Starboard
- [ ] Reagisci a un messaggio con ⭐ 5 volte (o quante serve per il threshold)
- [ ] Apri dashboard → Starboard
- **Risultato atteso:** Il messaggio appare nella lista con il count di stelle

### 4.5 Ricerca globale
- [ ] Apri dashboard → Ricerca Globale
- [ ] Cerca "test" (o altro termine)
- **Risultato atteso:** Risultati da membri, suggerimenti, tag, promemoria, etc.

---

## 5. Musica

### 5.1 Riproduzione
- [ ] Entra in un canale vocale
- [ ] Esegui `/music play https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **Risultato atteso:** Il bot entra in vocale e riproduce l'audio

### 5.2 Controlli
- [ ] Esegui `/music pause` → audio si ferma
- [ ] Esegui `/music resume` → audio riprende
- [ ] Esegui `/music skip` → passa alla prossima traccia (o esce se vuota)
- [ ] Esegui `/music queue` → mostra la coda
- [ ] Esegui `/music stop` → bot esce dal vocale

---

## 6. Backup

### 6.1 Backup manuale
- [ ] Esegui nel terminale: `npm run backup`
- **Risultato atteso:**
  - Log: `BackupScheduler: backup created backup_bloods_hub_db_*.json.gz`
  - File creato in `backups/`
  - Dimensione > 0

### 6.2 Verifica contenuto backup
- [ ] Esegui: `node -e "const fs=require('fs'); const zlib=require('zlib'); const f=fs.readdirSync('backups').sort().pop(); const d=JSON.parse(zlib.gunzipSync(fs.readFileSync('backups/'+f))); console.log('Tables:', Object.keys(d.tables).length, 'Rows:', d._meta.total_rows)"`
- **Risultato atteso:** 47 tabelle, ~23000 righe

---

## 7. Config

### 7.1 View
- [ ] Esegui `/config view`
- **Risultato atteso:** Mostra tutte le impostazioni:
  - Level-up channel: #annunci-gilda
  - Level-up message: 🎉 **{user}** ha raggiunto il livello **{level}**! 🩸
  - Welcome message: Benvenuto {user}...
  - Announcements channel: #annunci-community

### 7.2 Set level-up
- [ ] Esegui `/config levelup #canale-test Test livello {level}`
- **Risultato atteso:** Impostazione aggiornata
- [ ] Ripristina con `/config levelup #annunci-gilda 🎉 **{user}** ha raggiunto il livello **{level}**! 🩸`

---

## 8. Canali vocali temporanei

### 8.1 Creazione
- [ ] Entra nel canale "Clicca per Creare Canale Spedizione"
- **Risultato atteso:** Viene creato un canale vocale privato

### 8.2 Controlli owner
- [ ] Usa i controlli (rename, lock, limit)
- **Risultato atteso:** Il canale viene modificato

### 8.3 Eliminazione
- [ ] Esci dal canale (e fai uscire tutti)
- **Risultato atteso:** Il canale viene eliminato automaticamente quando vuoto

---

## 9. Giveaway

### 9.1 Creare giveaway
- [ ] Esegui `/giveaway create "Premio test" 1m 1`
- **Risultato atteso:** Embed giveaway postato con bottone "Partecipa"

### 9.2 Partecipare
- [ ] Clicca "Partecipa"
- **Risultato atteso:** Conferma partecipazione

### 9.3 Fine giveaway
- [ ] Aspetta 1 minuto
- **Risultato atteso:** Bot annuncia il vincitore automaticamente

---

## 10. Comandi custom

### 10.1 Creare comando
- [ ] Esegui `/cmd add benvenuto Benvenuti nel server!`
- **Risultato atteso:** Comando creato

### 10.2 Usare comando
- [ ] Scrivi `!benvenuto` in un canale
- **Risultato atteso:** Bot risponde con "Benvenuti nel server!"

### 10.3 Rimuovere comando
- [ ] Esegui `/cmd remove benvenuto`
- **Risultato atteso:** Comando eliminato

---

## 11. Messaggi programmati

### 11.1 Creare messaggio
- [ ] Esegui `/schedule add #canale "Test programmato" */1 * * * *`
- **Risultato atteso:** Messaggio programmato ogni minuto

### 11.2 Verifica invio
- [ ] Aspetta 1 minuto
- **Risultato atteso:** Messaggio postato nel canale

### 11.3 Disattivare
- [ ] Esegui `/schedule toggle <id>`
- **Risultato atteso:** Messaggio disattivato

---

## 12. Ticket

### 12.1 Aprire ticket
- [ ] Clicca "Apri Ticket" nel pannello #ticket-assistenza
- **Risultato atteso:** Canale `ticket-tuonome` creato, visibile solo a te + staff

### 12.2 Chiudere ticket
- [ ] Clicca "Chiudi Ticket"
- **Risultato atteso:** Canale eliminato dopo 5 secondi

---

## 13. Auto-thread

### 13.1 Abilitare
- [ ] Esegui `/autothread enable #canale-test`
- **Risultato atteso:** Auto-thread abilitato

### 13.2 Verifica
- [ ] Scrivi un messaggio in #canale-test
- **Risultato atteso:** Thread creato automaticamente

### 13.3 Disabilitare
- [ ] Esegui `/autothread disable #canale-test`

---

## 14. Hobbies (self-role)

### 14.1 Creare pannello
- [ ] Esegui `/hobbies` e seleziona alcuni hobby
- **Risultato atteso:** Pannello reaction role postato

### 14.2 Reagire
- [ ] Reagisci a un emoji
- **Risultato atteso:** Ruolo hobby assegnato

---

## 15. Verifica finale server Discord

### 15.1 Permessi canali
- [ ] #changelog: @everyone vede ma non scrive ✅/❌
- [ ] #updates: @everyone vede ma non scrive ✅/❌
- [ ] Officer+ può scrivere in #changelog e #updates ✅/❌

### 15.2 Gerarchia ruoli
- [ ] Owner > Founder > Consigliere > Bloods Admin > Bot > Officer ✅/❌
- [ ] "Membro della community" assegnato automaticamente dopo verifica ✅/❌

### 15.3 Canali DB
- [ ] announcements_channel_id → #annunci-community ✅/❌
- [ ] level_up_channel_id → #annunci-gilda ✅/❌
- [ ] auto_role_id → "Membro della community" ✅/❌

---

## Risultati

| Categoria | Test totali | Passati | Falliti |
|-----------|------------|---------|---------|
| Onboarding | 3 | | |
| Level-up | 2 | | |
| Feedback | 2 | | |
| Dashboard | 5 | | |
| Musica | 5 | | |
| Backup | 2 | | |
| Config | 2 | | |
| Temp VC | 3 | | |
| Giveaway | 3 | | |
| Custom cmd | 3 | | |
| Scheduled | 3 | | |
| Ticket | 2 | | |
| Auto-thread | 3 | | |
| Hobbies | 2 | | |
| Verifica finale | 3 | | |
| **TOTALE** | **43** | | |

---

## Note

- Data test: ___________
- Testato da: ___________
- Versione bot: ___________
- Problemi trovati:
  ```
  (scrivi qui eventuali problemi)
  ```
