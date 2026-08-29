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
- [ ] **eslint non installato in produzione**: `npm install --omit=dev` non installa eslint. Per il lint serve `npm install` completo
- [ ] **TikTok scrape non funziona**: TikTok serve login wall. Soluzioni: OAuth user flow, proxy terzo, o attendere approvazione app
- [ ] **Dashboard Next.js**: `dashboard/src/app` ha 0 file `page.tsx`. Il dashboard e servito come statico da `dashboard/out/`. Verificare `npm run dashboard:build`
- [ ] **1 TODO nel codice**: `src/services/cleanupScheduler.js:89` — "Use Sequelize instead of raw SQL hack"
- [ ] **Test coverage**: 217 test passano ma solo 5 file di test. Molti servizi non hanno test dedicati

### Miglioramenti architettura
- [ ] **Gestione errori globale**: alcuni servizi usano `.catch(() => {})` che nasconde errori. Aggiungere logging
- [ ] **Health check espanso**: monitorare piu servizi (YouTube, TikTok, RSS) con status dettagliato
- [ ] **Rate limiting Discord**: alcuni servizi postano con `@everyone`. Considerare rate limiting
- [ ] **Cache API esterne**: YouTube API quota 192 unità/giorno su 10.000. Da monitorare
- [ ] **DB migrations**: non ci sono migrazioni SQL esplicite. Le tabelle sono create da Sequelize `sync()`

### Funzionalità da aggiungere
- [ ] **Comando /social**: slash command che mostra statistiche YouTube + TikTok in Discord
- [ ] **Comando /content-idea**: slash command che genera idee contenuti basate su trend WoW
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
| Slash commands | 71 |
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

## 📝 Note

- **TikTok**: account accessibile, API limitata. Per auto-post completo serve OAuth user flow o approvazione app
- **YouTube**: canale operativo, 24 iscritti. Bot rileva nuovi video e posta in `#youtube` automaticamente
- **YouTube API quota**: 192 unità/giorno su 10.000 disponibili. Sicuri
- **Wowhead/Icy Veins RSS**: attivi, auto-post nel canale news WoW
- **Twitch alerts**: attivo, rileva membri in streaming via Discord presence
- **Vault criptato**: da inizializzare con `node scripts/crypto-vault.js init`
- **GOW_API_KEY**: management key in .env. Public key disponibile per future operazioni read-only
- **Dashboard**: 59 file sorgenti in `dashboard/src/`, build da verificare
- **eslint**: non installato in produzione (dev-only). Lint da eseguire in ambiente dev
