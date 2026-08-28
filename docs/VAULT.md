# Credentials Vault — Guida

Il progetto include un sistema di credenziali criptate per memorizzare in modo sicuro tutte le chiavi e i token necessari.

## Setup

```bash
# Inizializza il vault (scegli una master password di almeno 8 caratteri)
node scripts/crypto-vault.js init
```

## Inserire credenziali

```bash
node scripts/crypto-vault.js set
# Master password: ********
# Key name: WCL_CLIENT_SECRET
# Value: ********
```

## Leggere una credenziale

```bash
node scripts/crypto-vault.js get
# Master password: ********
# Key name: WCL_CLIENT_SECRET
# Output: il-valore
```

## Lista tutte le chiavi

```bash
node scripts/crypto-vault.js list
```

## Mostra tutte le credenziali

```bash
node scripts/crypto-vault.js dump
```

## Elimina una credenziale

```bash
node scripts/crypto-vault.js delete
```

## Credenziali consigliate da inserire

| Key | Descrizione | Dove ottenerla |
|-----|-------------|----------------|
| `DISCORD_TOKEN` | Token bot Discord | Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | OAuth2 secret | Discord Developer Portal |
| `JWT_SECRET` | Secret JWT dashboard | Generato (32+ char random) |
| `DB_PASSWORD` | Password MySQL | Configurazione server |
| `BATTLE_NET_CLIENT_ID` | Blizzard API client ID | Blizzard Developer Portal |
| `BATTLE_NET_CLIENT_SECRET` | Blizzard API secret | Blizzard Developer Portal |
| `WCL_CLIENT_ID` | Warcraft Logs client ID | warcraftlogs.com/api/clients |
| `WCL_CLIENT_SECRET` | Warcraft Logs secret | warcraftlogs.com/api/clients |
| `GOW_API_KEY` | Guilds of WoW API key | guildsofwow.com/bloods → Manage → API |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | Google Cloud Console → abilita YouTube Data API v3 |
| `YOUTUBE_CHANNEL_ID` | ID canale YouTube Bloods | YouTube Studio → Impostazioni → Avanzate |
| `TIKTOK_CLIENT_KEY` | TikTok Display API key | TikTok for Developers → crea app |
| `TIKTOK_CLIENT_SECRET` | TikTok Display API secret | TikTok for Developers → crea app |
| `TIKTOK_USERNAME` | Username TikTok Bloods | URL profilo TikTok |
| `STEAM_API_KEY` | Steam API key | steamcommunity.com/dev/apikey |
| `RIOT_API_KEY` | Riot API key | developer.riotgames.com |
| `ALERT_WEBHOOK_URL` | Webhook alert Discord | Discord channel → Integrazioni → Webhook |
| `GITHUB_PAT` | Personal Access Token GitHub | GitHub Settings → Developer settings → PAT |

## Sicurezza

- **AES-256-GCM** con autenticazione
- **PBKDF2** key derivation (100k iterazioni, SHA-256)
- File: `.vault.enc` (criptato) + `.vault.salt` (salt)
- Entrambi gitignored — **mai committare**
- La master password non è salvata da nessuna parte
- Se dimentichi la password, i dati sono persi irreversibilmente

## Backup

Copia `.vault.enc` e `.vault.salt` in un luogo sicuro (es. password manager, USB criptata). Senza entrambi i file + la password, non è possibile recuperare le credenziali.
