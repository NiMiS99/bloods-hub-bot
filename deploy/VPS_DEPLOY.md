# Bloods Hub Bot — Linux VPS deployment (bare-metal, no Docker)

Tested on Ubuntu 22.04 LTS / Debian 12.

## 1. System prerequisites

```bash
sudo apt update && sudo apt install -y curl git build-essential
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# PM2
sudo npm install -g pm2
# MySQL 8
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

## 2. Database

```bash
sudo mysql <<'SQL'
CREATE DATABASE bloods_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bloods_bot'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON bloods_hub.* TO 'bloods_bot'@'localhost';
FLUSH PRIVILEGES;
SQL
```

Load the schema:

```bash
mysql -u bloods_bot -p bloods_hub < db/00_schema.sql
mysql -u bloods_bot -p bloods_hub < db/01_seed_games.sql
```

## 3. Bot

```bash
git clone <your-repo> /opt/bloods-hub-bot
cd /opt/bloods-hub-bot
cp .env.example .env
# edit .env: DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, DB_PASSWORD, API keys
npm ci --omit=dev
npm run deploy:commands   # register slash commands
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup               # follow the printed instruction to enable boot-start
```

## 4. Updating

```bash
cd /opt/bloods-hub-bot
git pull
npm ci --omit=dev
npm run migrate           # idempotent
npm run deploy:commands
pm2 restart bloods-hub-bot
```

## 5. Logs

```bash
pm2 logs bloods-hub-bot
tail -f /opt/bloods-hub-bot/logs/bot-$(date +%F).log
```

## 6. Backups

```bash
# Daily DB dump via cron
0 3 * * *  mysqldump -u bloods_bot -p'PWD' bloods_hub | gzip > /var/backups/bloods_hub_$(date +\%F).sql.gz
```
