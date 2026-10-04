#!/usr/bin/env bash
# Deploy SIWarga di server produksi. Dipanggil oleh GitHub Actions
# (.github/workflows/ci-cd.yml) lewat SSH:
#
#   DEPLOY_SHA=<commit> bash deploy/deploy.sh
#
# Prasyarat di server: docker + compose plugin, akses git ke repo, dan
# file .env produksi di $APP_DIR (ditulis oleh workflow dari secret PROD_ENV).
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/apps/siwarga}"
COMPOSE=(docker compose -p siwarga -f docker-compose.prd.yml)

cd "$APP_DIR"

echo ">> Checkout ${DEPLOY_SHA:-origin/main}"
git fetch --quiet origin main
git reset --hard "${DEPLOY_SHA:-origin/main}"

# FTP_ENABLED=false di .env mematikan service ftp (image pure-ftpd hanya
# tersedia untuk amd64, jadi tidak jalan di server ARM64).
UP_ARGS=(up -d --build --remove-orphans)
if grep -qE '^FTP_ENABLED=false$' .env; then
    UP_ARGS+=(--scale ftp=0)
fi

echo ">> Build & start stack"
"${COMPOSE[@]}" "${UP_ARGS[@]}"

BIND_IP=$(grep -E '^HOST_BIND_IP=' .env | cut -d= -f2-)
BACKEND_PORT=$(grep -E '^BACKEND_PORT=' .env | cut -d= -f2-)
HEALTH_URL="http://${BIND_IP:-127.0.0.1}:${BACKEND_PORT:-8000}/up"

# /up baru merespons setelah entrypoint (migrasi + cache) selesai dan
# supervisord menjalankan nginx/php-fpm.
echo ">> Menunggu backend sehat ($HEALTH_URL)"
for _ in $(seq 1 60); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
        break
    fi
    sleep 5
done
curl -fsS "$HEALTH_URL" >/dev/null

# Seed awal (roles, permissions, akun admin, halaman) hanya saat database
# masih kosong; deploy berikutnya cukup menyinkronkan permission & role
# (keduanya idempoten) agar permission baru ikut masuk.
USER_COUNT=$("${COMPOSE[@]}" exec -T backend php artisan tinker --execute 'echo App\Models\User::count();' 2>/dev/null | tail -n1 | tr -dc '0-9' || true)
if [ -z "$USER_COUNT" ]; then
    echo "Gagal membaca jumlah user dari backend." >&2
    exit 1
fi
if [ "${USER_COUNT:-0}" = "0" ]; then
    echo ">> Database kosong: seeding awal"
    "${COMPOSE[@]}" exec -T backend php artisan db:seed --force
else
    "${COMPOSE[@]}" exec -T backend php artisan db:seed --class=PermissionSeeder --force
    "${COMPOSE[@]}" exec -T backend php artisan db:seed --class=RoleSeeder --force
fi

echo ">> Backend /up OK"

docker image prune -f >/dev/null
echo ">> Deploy selesai: $(git rev-parse --short HEAD)"
