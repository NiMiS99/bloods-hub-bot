# Deployment Guide — Bloods Hub Bot

## Architettura

```
Internet → Nginx (443/SSL) → Express (4567) → Bot Discord + MySQL
```

Nginx funge da reverse proxy con SSL, gzip e cache statici.
Express serve sia le API REST che il frontend statico (Next.js export).

## 1. Configurazione Nginx

File: `C:\nginx\conf\nginx.conf`

```nginx
# SSL certs in C:/nginx/ssl/
# Proxy: http://127.0.0.1:4567
# Gzip attivo globalmente
# Cache statici: 30d per asset, 365d per _next/static/
```

### Rinnovo SSL (Let's Encrypt)
```bash
# Usando win-acme (https://www.win-acme.com/)
wacs.exe --target manual --host bloodswow.it --store pemfiles --pemfilespath C:\nginx\ssl --installation manual --installationsite none
```

## 2. PM2 Process Manager

```bash
# Avvia
pm2 start ecosystem.config.js

# Restart dopo modifiche
pm2 restart bloods-hub-bot --update-env

# Salva stato (survive reboot)
pm2 save
pm2 startup

# Log
pm2 logs bloods-hub-bot --lines 50

# Status
pm2 list
```

## 3. Build Dashboard

```bash
cd dashboard
npm install
npm run build  # genera dashboard/out/
```

Il frontend viene servito da Express da `dashboard/out/`.

## 4. Database MySQL

```bash
# Migrazioni
npm run db:migrate

# Backup manuale
npm run db:backup

# Restore
npm run db:restore -- --file backups/latest.sql
```

## 5. Discord Developer Portal

### Configurazione OAuth2
1. Vai su https://discord.com/developers/applications → tuo bot
2. **OAuth2 → General → Redirects**:
   - `https://bloodswow.it/api/auth/callback`
3. **OAuth2 → URL Generator**: scopes `identify`, `guilds`

### Privileged Gateway Intents
- ✅ Presence Intent (per discord-widget)
- ✅ Server Members Intent (per members fetch)
- ✅ Message Content Intent (per comandi e automod)

## 6. SEO & Indicizzazione

### Google Search Console
1. Vai su https://search.google.com/search-console
2. Aggiungi proprietà `bloodswow.it`
3. Verifica via meta tag (già presente in layout.js)
4. Invia sitemap: `https://bloodswow.it/sitemap.xml`

### Bing Webmaster Tools
1. Vai su https://www.bing.com/webmasters
2. Aggiungi sito `bloodswow.it`
3. Verifica via `BingSiteAuth.xml` (già presente in /public)
4. Invia sitemap: `https://bloodswow.it/sitemap.xml`

### DuckDuckGo
Indicizza automaticamente dai risultati Bing.

## 7. Monitoring

- **Health check**: `https://bloodswow.it/api/health`
- **PM2 monitoring**: `pm2 monit`
- **Log errori**: `pm2 logs bloods-hub-bot --err --lines 20`
- **Alert Discord**: webhook configurato in `.env` (ALERT_WEBHOOK_URL)

## 8. Backup

- **Database**: backup automatico giornaliero in `backups/`
- **Configurazione**: `.env`, `nginx.conf`, `ecosystem.config.js`
- **Dashboard**: `dashboard/out/` (rigenerabile con build)
