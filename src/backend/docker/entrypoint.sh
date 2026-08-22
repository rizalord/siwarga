#!/usr/bin/env bash
set -e

cd /var/www/html

# composer.json/lock may have changed since the image was built (bind mount).
if [ ! -f vendor/composer/installed.php ] || [ composer.lock -nt vendor/composer/installed.php ]; then
    mkdir -p vendor
    composer_lock_dir=vendor/.composer-install-lock

    while ! mkdir "$composer_lock_dir" 2>/dev/null; do
        sleep 1
    done

    cleanup_composer_lock() {
        rmdir "$composer_lock_dir" 2>/dev/null || true
    }

    trap cleanup_composer_lock EXIT

    composer install --no-interaction --prefer-dist

    rmdir "$composer_lock_dir"
    trap - EXIT
fi

if [ -z "$APP_KEY" ]; then
    echo ">> APP_KEY kosong, generate sementara untuk sesi container ini."
    export APP_KEY="base64:$(openssl rand -base64 32)"
    echo ">> Simpan baris berikut ke .env di root project agar permanen:"
    echo "APP_KEY=${APP_KEY}"
fi

echo ">> Menunggu database ${DB_HOST:-db}:${DB_PORT:-3306}..."
until php -r "new PDO('mysql:host=${DB_HOST:-db};port=${DB_PORT:-3306}', '${DB_USERNAME}', '${DB_PASSWORD}');" >/dev/null 2>&1; do
    sleep 1
done
echo ">> Database siap."

php artisan migrate --force

# Storage symlink dengan target RELATIF agar valid di dalam container maupun
# di host (workflow native). Dibuat ulang kalau symlink hilang, patah, atau
# masih menunjuk path absolut sisa `storage:link` dari host.
mkdir -p storage/app/public
if [ ! -L public/storage ] || [ ! -e public/storage ]; then
    rm -f public/storage
    ln -s ../storage/app/public public/storage
fi

exec "$@"
