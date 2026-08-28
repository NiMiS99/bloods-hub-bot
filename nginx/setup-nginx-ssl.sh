#!/bin/bash
# Script di setup Nginx + SSL per bloodswow.it
# Eseguire sul server come root (o con sudo)
# Usage: bash setup-nginx-ssl.sh

set -e

DOMAIN="bloodswow.it"
BOT_PORT=4567

echo "========================================="
echo "  Setup Nginx + SSL per $DOMAIN"
echo "========================================="

# 1. Installa nginx e certbot se non presenti
if ! command -v nginx &> /dev/null; then
    echo "[1/6] Installazione Nginx..."
    apt-get update -qq
    apt-get install -y -qq nginx
else
    echo "[1/6] Nginx gia installato"
fi

if ! command -v certbot &> /dev/null; then
    echo "[2/6] Installazione Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx
else
    echo "[2/6] Certbot gia installato"
fi

# 3. Crea directory per Let's Encrypt
echo "[3/6] Creazione directory certbot..."
mkdir -p /var/www/certbot

# 4. Copia configurazione Nginx
echo "[4/6] Copia configurazione Nginx..."
cp "$(dirname "$0")/bloodswow.it.conf" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

# Rimuovi default se presente
rm -f /etc/nginx/sites-enabled/default

# Test configurazione
nginx -t

# 5. Ricarica Nginx
echo "[5/6] Ricarica Nginx..."
systemctl reload nginx

# 6. Genera certificato SSL con Certbot
echo "[6/6] Generazione certificato SSL Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --non-interactive \
    --agree-tos \
    --email info@$DOMAIN \
    --redirect \
    --no-eff-email

echo ""
echo "========================================="
echo "  SETUP COMPLETATO!"
echo "========================================="
echo ""
echo "  Sito:      https://$DOMAIN"
echo "  Sitemap:   https://$DOMAIN/sitemap.xml"
echo "  robots:    https://$DOMAIN/robots.txt"
echo ""
echo "  Prossimi passi:"
echo "  1. Verifica che il DNS punti a questo server:"
echo "     dig $DOMAIN"
echo "  2. Sottometti la sitemap su Google Search Console:"
echo "     https://search.google.com/search-console"
echo "  3. Richiedi indicizzazione della homepage"
echo ""
echo "  Rinnovo automatico SSL: gia configurato da certbot"
echo "  (verifica con: certbot renew --dry-run)"
echo ""
