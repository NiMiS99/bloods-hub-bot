# Cose da Fare — Bloods Hub Bot & Community

> File creato il 28/08/2026. Aggiornare dopo ogni completamento.

---

## 🔴 Priorità Alta — Deploy & Server

- [ ] **Deploy sul server**: dopo il push, eseguire sul server:
  ```bash
  cd C:\Users\Administrator\Desktop\bloods-hub-bot
  git pull
  npm ci --omit=dev
  npm run db:migrate
  npm run deploy:commands
  npm run dashboard:build
  pm2 restart bloods-hub-bot --update-env
  pm2 save
  ```
- [ ] **Verificare avvio servizi**: controllare log PM2 per confermare che YouTubeService, TikTokService, TwitchAlertService, DynamicStatusService, RaidSummaryService partano correttamente
- [ ] **Creare canali Discord per social**: `#youtube`, `#tiktok`, `#content-creator` (nella categoria Community Hub) per ricevere gli auto-post dei servizi
- [ ] **Configurare DB per birthday**: verificare che `birthday_channel_id` e `birthday_role_id` siano impostati nella tabella `guilds` per il guild_id 1010226759817515018
- [ ] **Inizializzare vault criptato**: eseguire `node scripts/crypto-vault.js init` sul server e inserire tutte le credenziali come backup sicuro

---

## 🟡 Priorità Media — Account Social & Crescita

### YouTube (Canale: UCGp48_BZswBVO1hc6VmZKpg)
**Stato attuale**: Canale esistente, descrizione configurata, nessun video visibile.

- [ ] **Caricare primo video**: creare un video di presentazione della gilda (30-60s)
  - Idea: "Benvenuti nei Bloods — Gilda WoW Pozzo dell'Eternità EU"
  - Mostrare: sito, Discord, bot, raid schedule, community
- [ ] **Ottimizzare il canale**:
  - [ ] Aggiungere banner canale (immagine gilda 2560x1440px)
  - [ ] Aggiungere logo profilo (immagine logo Bloods 800x800px)
  - [ ] Creare playlist: "Raid Recap", "Guide WoW", "Community Moments"
  - [ ] Aggiungere link Discord + sito in descrizione canale
- [ ] **Piano contenuti YouTube** (1 video/settimana):
  - Settimana 1: Video presentazione gilda
  - Settimana 2: Guida al sistema Bloods Points (BP/DKP)
  - Settimana 3: Raid recap (highlight boss kill con WCL)
  - Settimana 4: Come unirsi ai Bloods — tutorial onboarding
- [ ] **SEO YouTube**:
  - Tag: WoW, World of Warcraft, gilda italiana, Pozzo dell'Eternità, raid, M+, Midnight
  - Titoli: keyword + emozione (es. "PRIMO BOSS KILL MITICO — Bloods Guild")
  - Thumbnail personalizzate per ogni video
  - Descrizione con timestamp, link Discord, link sito

### TikTok (Account: @bloodswow)
**Stato attuale**: Account esiste, non accessibile (da recuperare).

- [ ] **Recuperare accesso TikTok**: reset password o recupero via email
- [ ] **Ottimizzare profilo**:
  - [ ] Bio: "Gilda WoW IT 🛡️ Raid · M+ · PvP · Discord → link in bio"
  - [ ] Link in bio: bloodswow.it
  - [ ] Logo profilo Bloods
- [ ] **Piano contenuti TikTok** (3-5 video/settimana):
  - Clip raid/kill boss (15-30s con musica trending)
  - "POV: sei nei Bloods" (meme WoW)
  - Highlight M+ keys
  - Tutorial rapidi (30s): come fare X in WoW
  - Behind the scenes: Discord, bot, community
- [ ] **Hashtag strategy**: #wow #worldofwarcraft #wowitalia #guild #raid #mythicplus #bloodswow #pozziolleternità
- [ ] **Cross-posting**: ogni TikTok → YouTube Shorts (stesso contenuto, piattaforma diversa)

### Sito Web (bloodswow.it)
**Stato attuale**: Online, 7 pagine, SEO base configurata.

- [ ] **Aggiungere pagina YouTube**: embed canale + ultimi video
- [ ] **Aggiungere pagina TikTok**: embed feed TikTok
- [ ] **Aggiungere sezione social**: link a YouTube, TikTok, Discord nel footer
- [ ] **Google Search Console**: aggiungere sito + verificare + inviare sitemap (manuale, account personale)
- [ ] **Bing Webmaster Tools**: aggiungere sito + verificare + inviare sitemap (manuale)
- [ ] **Blog/News page**: pubblicare articoli WoW (patch notes, guide) per SEO

### Discord
- [ ] **Canale #youtube**: per auto-post video
- [ ] **Canale #tiktok**: per auto-post TikTok
- [ ] **Canale #social-announcements**: cross-posting generale
- [ ] **Ruolo @Content Creator**: per membri che creano contenuti
- [ ] **Evento "Clip of the Week"**: premio mensile per miglior clip WoW

---

## 🟢 Priorità Bassa — Future Features

- [ ] **Spotify integration**: music service con playlist condivise (richiede SPOTIFY_CLIENT_ID/SECRET)
- [ ] **Riot API integration**: LoL/Valorant tracking (richiede RIOT_API_KEY)
- [ ] **Bing Webmaster API**: tracking SEO insights automatici (richiede BING_WEBMASTER_API_KEY)
- [ ] **Google Search Console API**: tracking query/keyword insights (richiede Service Account)
- [ ] **TikTok API mode**: quando l'account è recuperato, verificare che l'app sia approvata e l'API mode funzioni
- [ ] **WhatsApp Business API**: notifiche raid/eventi via WhatsApp (richiede numero business dedicato)
- [ ] **Archon.gg API**: monitorare se rilasciano API pubblica (dati simili a Raider.IO)
- [ ] **Twitch API ufficiale**: oltre al presence detection, usare Twitch API per clip/highlight tracking
- [ ] **Instagram integration**: se la gilda apre account Instagram
- [ ] **Google Analytics 4**: tracking visite sito bloodswow.it

---

## 📊 Strategia Crescita — Timeline

### Settimana 1 (immediata)
1. Deploy sul server + verifica servizi
2. Creare canali Discord per social
3. Recuperare accesso TikTok
4. Caricare primo video YouTube (presentazione gilda)
5. Pubblicare primi 3 TikTok (clip/meme WoW)

### Settimane 2-4
1. 1 video YouTube/settimana (raid recap, guide, tutorial)
2. 3-5 TikTok/settimana
3. Cross-posting TikTok → YouTube Shorts
4. Ottimizzare SEO canale YouTube (tag, descrizioni, thumbnail)
5. Aggiungere pagine social al sito

### Mese 2-3
1. Google Search Console + Bing Webmaster (SEO tracking)
2. Blog/news page sul sito con articoli WoW
3. Collaborazioni con altri creator WoW IT
4. "Clip of the Week" evento Discord
5. Analizzare analytics YouTube/TikTok e ottimizzare contenuti

### Mese 4-6
1. 100+ iscritti YouTube
2. 500+ follower TikTok
3. 1000+ visite/mese sito web
4. 50+ membri Discord attivi
5. Roster raid mitico completo (20 player)

---

## 📝 Note

- **TikTok account**: da recuperare (reset password o email recovery)
- **YouTube**: canale configurato, pronto per contenuti
- **Wowhead/Icy Veins RSS**: attivi dopo deploy, auto-post nel canale news WoW
- **Twitch alerts**: attivo dopo deploy, rileva membri in streaming via Discord presence
- **Vault criptato**: da inizializzare sul server come backup credenziali
- **GOW_API_KEY**: hai fornito 2 key (public + management). Nel .env è inserita la management key. La public key (CLTZME3J36UB854HS0FP0F3FXOJ9M6ET) può servire per operazioni read-only future
