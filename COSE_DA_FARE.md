# Cose da Fare — Bloods Hub Bot & Community

> File creato il 28/08/2026. Ultimo aggiornamento: 29/08/2026.

---

## ✅ Completato

- [x] **Deploy sul server**: codice pushato, bot riavviato, servizi operativi
- [x] **Fix avatar_url**: colonna aggiunta alla tabella `users`
- [x] **Fix DynamicStatus null**: null guard su `client.user` + ritardo 10s
- [x] **Canali Discord social**: `#youtube` (1542980488132563135) e `#tiktok` (1542980490036781076) creati
- [x] **Embed invito Discord**: postato in `#invito-discord` e `#invito-wow-community`
- [x] **Embed in tutti i canali**: 128/128 canali testuali hanno embed bot (22 postati ora, 106 gia presenti)
- [x] **YouTubeService**: operativo, controlla ogni 15min, canale "Bloods" (24 iscritti, 3369 views, 5 video)
- [x] **TikTokService**: attivo, API mode con fallback scrape (limitato da login wall TikTok)
- [x] **SocialGrowthService**: tracciamento giornaliero, report settimanali, idee contenuti, SEO audit
- [x] **Grafiche social**: copiate in `social-media/` (loghi, banner, streaming bg, icone, meme)
- [x] **Docs gilda**: copiate in `docs/gilda/` (regolamento, roster, professioni, reclutamento)
- [x] **Docs rilancio**: 31 file copiate in `docs/rilancio/`
- [x] **File inutili**: cancellati ~150MB di duplicati dalla cartella originale
- [x] **DB birthday**: `birthday_channel_id` e `birthday_role_id` gia configurati
- [x] **DB level_up**: `level_up_channel_id` e `level_up_message` gia configurati
- [x] **Wowhead/Icy Veins RSS**: attivi, auto-post nel canale news WoW
- [x] **Twitch alerts**: attivo, rileva membri in streaming via Discord presence
- [x] **Copione primo video YouTube**: pronto in `social-media/scripts/001-presentazione-gilda.md`

---

## � Priorità Alta — Da fare (manuale)

### YouTube (Canale: UCGp48_BZswBVO1hc6VmZKpg — 24 iscritti)
**Stato attuale**: 5 video pubblicati (dic 2025), nessuna descrizione, nessun tag, nessun keyword nel canale.

- [ ] **Ottimizzare canale YouTube Studio** (manuale, richiede browser):
  - [ ] Aggiungere keyword: `WoW, World of Warcraft, gilda italiana, Pozzo dell'Eternità, raid, M+, Midnight, Bloods, WoW Italia, MMORPG`
  - [ ] Aggiungere banner canale (file in `social-media/graphics/banners/`)
  - [ ] Aggiungere logo profilo (file in `social-media/graphics/logo/`)
  - [ ] Creare playlist: "Raid Recap", "Guide WoW", "Community Moments"
- [ ] **Ottimizzare i 5 video esistenti** (manuale, richiede YouTube Studio):
  - [ ] Aggiungere descrizioni con link Discord + sito + timestamp
  - [ ] Aggiungere tag SEO a ogni video
  - [ ] Cambiare titoli in piu descrittivi/SEO-friendly
  - [ ] Aggiungere thumbnail personalizzate
- [ ] **Caricare nuovo video**: usare copione in `social-media/scripts/001-presentazione-gilda.md`
- [ ] **Piano contenuti** (1 video/settimana):
  - Settimana 1: Video presentazione gilda
  - Settimana 2: Guida al sistema Bloods Points
  - Settimana 3: Raid recap (highlight boss kill)
  - Settimana 4: Come unirsi ai Bloods — tutorial onboarding

### TikTok (@bloodswow)
**Stato attuale**: Account accessibile, API limitata (client_credentials non da accesso video).

- [ ] **Ottimizzare profilo TikTok** (manuale, richiede app):
  - [ ] Bio: "Gilda WoW IT 🛡️ Raid · M+ · PvP · Discord → link in bio"
  - [ ] Link in bio: bloodswow.it
  - [ ] Logo profilo Bloods
- [ ] **Verificare app TikTok for Developers** (manuale):
  - Andare su https://developers.tiktok.com → Manage apps
  - Verificare che l'app sia in stato "Approved" per accesso video
  - Se non approvata, richiedere review
- [ ] **Pubblicare primi 3 TikTok** (manuale):
  - Clip raid/kill boss (15-30s con musica trending)
  - "POV: sei nei Bloods" (meme WoW)
  - Highlight M+ keys
- [ ] **Hashtag strategy**: #wow #worldofwarcraft #wowitalia #guild #raid #mythicplus #bloodswow
- [ ] **Cross-posting**: ogni TikTok → YouTube Shorts

### Sito Web (bloodswow.it)
- [ ] **Aggiungere pagina YouTube**: embed canale + ultimi video (richiede modifica dashboard Next.js)
- [ ] **Aggiungere pagina TikTok**: embed feed TikTok
- [ ] **Aggiungere sezione social nel footer**: link YouTube, TikTok, Discord
- [ ] **Google Search Console**: aggiungere sito + verificare + inviare sitemap (manuale)
- [ ] **Blog/News page**: pubblicare articoli WoW per SEO

---

## 🟡 Priorità Media — Miglioramenti tecnici bot

### Bug & Issue noti
- [x] **Gestione errori globale**: fixato — tutti i `.catch(() => {})` nei servizi social ora loggano errori
- [x] **TODO stale in leaderboardScheduler.js**: rimosso — era gia implementato con Sequelize
- [x] **Dashboard build**: verificato — builda correttamente con 7 pagine e sitemap
- [ ] **eslint non installato in produzione**: `npm install --omit=dev` non installa eslint. Per il lint serve `npm install` completo
- [ ] **TikTok scrape non funziona**: TikTok serve login wall. Soluzioni: OAuth user flow, proxy terzo, o attendere approvazione app
- [ ] **Test coverage**: 217 test passano ma solo 5 file di test. Molti servizi non hanno test dedicati

### Miglioramenti architettura
- [ ] **Health check espanso**: monitorare piu servizi (YouTube, TikTok, RSS) con status dettagliato
- [ ] **Rate limiting Discord**: alcuni servizi postano con `@everyone`. Considerare rate limiting
- [ ] **Cache API esterne**: YouTube API quota 192 unità/giorno su 10.000. Da monitorare
- [ ] **DB migrations**: non ci sono migrazioni SQL esplicite. Le tabelle sono create da Sequelize `sync()`

### Funzionalità da aggiungere
- [x] **Comando /social**: creato — mostra stats YouTube + TikTok + crescita
- [x] **Comando /content-idea**: creato — genera idee contenuti basate su trend WoW
- [ ] **Auto-thumbnail YouTube**: generare thumbnail con canvas (@napi-rs/canvas gia installato)
- [ ] **Cross-post automatico**: quando un video YouTube viene pubblicato, postare anche in TikTok/Short
- [ ] **Discord server template**: esportare template del server per replicazione

---

## 🟢 Priorità Bassa — Future Features

- [ ] **Spotify integration**: music service con playlist condivise (richiede SPOTIFY_CLIENT_ID/SECRET)
- [ ] **Riot API integration**: LoL/Valorant tracking (richiede RIOT_API_KEY)
- [ ] **Google Search Console API**: tracking query/keyword insights (richiede Service Account)
- [ ] **Bing Webmaster API**: tracking SEO insights
- [ ] **WhatsApp Business API**: notifiche raid/eventi via WhatsApp
- [ ] **Instagram integration**: se la gilda apre account Instagram
- [ ] **Google Analytics 4**: tracking visite sito
- [ ] **Archon.gg API**: monitorare se rilasciano API pubblica
- [ ] **Twitch API ufficiale**: clip/highlight tracking oltre al presence detection

---

## 📊 Statistiche progetto (29/08/2026)

| Metrica | Valore |
|---------|--------|
| Slash commands | 73 |
| Servizi | 61 |
| Modelli DB | 48 |
| Route API | 22 |
| Eventi Discord | 13 |
| Pannelli UI | 6 |
| Test | 217 (tutti passing) |
| Dipendenze | 20 |
| Dev dependencies | 6 |
| Canali Discord con embed | 128/128 |
| Docs gilda | 6 file |
| Docs rilancio | 31 file |
| Grafiche social | 20+ file |

---

## 📊 Strategia Crescita — Timeline

### Settimana 1 (immediata)
1. ✅ Deploy + servizi operativi
2. ✅ Canali Discord social creati
3. ✅ Embed postati in tutti i canali
4. ⬜ Ottimizzare canale YouTube (keyword, banner, playlist)
5. ⬜ Caricare primo video YouTube (presentazione gilda)
6. ⬜ Pubblicare primi 3 TikTok

### Settimane 2-4
1. 1 video YouTube/settimana (raid recap, guide, tutorial)
2. 3-5 TikTok/settimana
3. Cross-posting TikTok → YouTube Shorts
4. SEO canale YouTube (tag, descrizioni, thumbnail)
5. Aggiungere pagine social al sito

### Mese 2-3
1. Google Search Console + Bing Webmaster
2. Blog/news page sul sito
3. Collaborazioni con creator WoW IT
4. "Clip of the Week" evento Discord
5. Analizzare analytics e ottimizzare

### Mese 4-6
1. 100+ iscritti YouTube
2. 500+ follower TikTok
3. 1000+ visite/mese sito
4. 50+ membri Discord attivi
5. Roster raid mitico completo (20 player)

---

## � Piano Lavoro Manuale — Domani (30/08/2026)

### Mattina (1-2 ore)

1. **YouTube Studio** (10 min)
   - Vai su https://studio.youtube.com → Impostazioni → Avanzate
   - Aggiungi keyword: `WoW, World of Warcraft, gilda italiana, Pozzo dell'Eternità, raid, M+, Midnight, Bloods, WoW Italia, MMORPG`
   - Carica banner da `social-media/graphics/banners/banner-main.png`
   - Carica logo da `social-media/graphics/logo/logo.png`

2. **Ottimizza i 5 video esistenti** (30 min)
   - Per ogni video: modifica titolo, aggiungi descrizione con link Discord + sito, aggiungi tag
   - Video 1 "Ce l'abbiamo fatta!" → "PRIMO KILL — Bloods Guild raid mitico WoW"
   - Video 2 "Soulbinder" → "Soulbinder BOSS KILL — Bloods Guild Pozzo dell'Eternità"
   - Video 3 "Come un film di orrore" → "WIPE FESTIVAL — Raid WoW che fa paura 😱 Bloods"
   - Video 4 "Ride bene chi ride ultimo" → "MOMENTI DIVERTENTI — Raid WoW Bloods Guild"
   - Video 5 "Vai campione" → "CLUTCH EPICO — Bloods Guild WoW Highlight"
   - Descrizione tipo: `Bloods Guild — Gilda WoW Pozzo dell'Eternità EU (Orda)\nDiscord: https://discord.gg/DrGMeEMxF6\nSito: https://bloodswow.it\n\n#WoW #WorldOfWarcraft #Bloods #Raid #GildaItaliana`

3. **Crea playlist YouTube** (10 min)
   - "Raid Recap" — sposta i 5 video qui
   - "Guide WoW" — vuota, per futuri contenuti
   - "Community Moments" — vuota

4. **TikTok app** (15 min)
   - Apri TikTok, vai su profilo @bloodswow
   - Aggiorna bio: "Gilda WoW IT 🛡️ Raid · M+ · PvP · Discord → link in bio"
   - Aggiungi link: bloodswow.it
   - Carica logo da `social-media/graphics/logo/logo.png`

5. **TikTok for Developers** (10 min)
   - Vai su https://developers.tiktok.com → Manage apps
   - Verifica stato app (awi34l04hto3o607)
   - Se non approvata, richiedi review

### Pomeriggio (1-2 ore)

6. **Pubblica primi 3 TikTok** (30 min)
   - Usa i video meme in `social-media/raw/` o registra clip WoW nuove
   - Hashtag: #wow #worldofwarcraft #wowitalia #guild #raid #bloodswow
   - Cross-posta ogni TikTok come YouTube Short

7. **Google Search Console** (15 min)
   - Vai su https://search.google.com/search-console
   - Aggiungi proprietà: bloodswow.it
   - Verifica (DNS o HTML tag)
   - Invia sitemap: https://bloodswow.it/sitemap.xml

8. **Inizializza crypto vault** (5 min)
   - Esegui: `node scripts/crypto-vault.js init`
   - Inserisci password sicura (min 8 caratteri)
   - Salva le credenziali principali

9. **Testa i nuovi comandi Discord** (10 min)
   - Usa `/social` in Discord per vedere le statistiche
   - Usa `/content-idea` per generare idee contenuti
   - Verifica che i bot postino correttamente

### Sera (opzionale)

10. **Registra primo video YouTube** (1 ora)
    - Usa il copione in `social-media/scripts/001-presentazione-gilda.md`
    - 30-60 secondi, mostra sito + Discord + community
    - Carica su YouTube con titolo SEO-friendly

---

## �📝 Note

- **TikTok**: account accessibile, API limitata. Per auto-post completo serve OAuth user flow o approvazione app
- **YouTube**: canale operativo, 24 iscritti. Bot rileva nuovi video e posta in `#youtube` automaticamente
- **YouTube API quota**: 192 unità/giorno su 10.000 disponibili. Sicuri
- **Wowhead/Icy Veins RSS**: attivi, auto-post nel canale news WoW
- **Twitch alerts**: attivo, rileva membri in streaming via Discord presence
- **Vault criptato**: da inizializzare con `node scripts/crypto-vault.js init` (richiede password interattiva)
- **GOW_API_KEY**: management key in .env. Public key disponibile per future operazioni read-only
- **Dashboard**: 59 file sorgenti, build verificato (7 pagine + sitemap)
- **eslint**: non installato in produzione (dev-only). Lint da eseguire in ambiente dev
- **Comandi nuovi**: `/social` e `/content-idea` deployati e operativi (73 totali)
- **Error logging**: tutti i servizi social ora loggano errori invece di ingoiarli silenziosamente
