#!/bin/sh
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "APP_KEY belum di-set. Set APP_KEY di .env root (generate dengan: php artisan key:generate --show)." >&2
    exit 1
fi

echo ">> Menunggu database ${DB_HOST:-db}:${DB_PORT:-3306}..."
until php -r "new PDO('mysql:host=${DB_HOST:-db};port=${DB_PORT:-3306}', '${DB_USERNAME}', '${DB_PASSWORD}');" >/dev/null 2>&1; do
    sleep 1
done
echo ">> Database siap."

# Hanya service backend yang menjalankan migrasi; queue/scheduler start
# bersamaan dan migrasi paralel di database baru bisa saling balapan.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

if [ ! -L public/storage ]; then
    php artisan storage:link
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache

exec "$@"
