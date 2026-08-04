<div align="center">

# SIWarga
### Sistem Informasi Manajemen Administrasi RT

🇮🇩 Bahasa Indonesia&nbsp;&nbsp;|&nbsp;&nbsp;🇬🇧 [English](README.en.md)

</div>

Aplikasi web untuk mengelola administrasi RT: penghuni, rumah, iuran bulanan, pembayaran, pengeluaran, dan laporan keuangan. Dibangun dengan arsitektur **API-first (decoupled)** — backend Laravel dan frontend React SPA yang terpisah sepenuhnya.

![SIWarga Dashboard](docs/screenshots/dashboard.png)

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Tech Stack](#tech-stack)
- [Struktur Repository](#struktur-repository)
- [Instalasi](#instalasi)
  - [Opsi 1 — Native Tanpa Docker (Development Lokal)](#opsi-1--native-tanpa-docker-development-lokal)
  - [Opsi 2 — Docker (Opsional)](#opsi-2--docker-opsional)
  - [Opsi 3 — Native / Manual (untuk VPS Production)](#opsi-3--native--manual-untuk-vps-production)
- [Akun Demo](#akun-demo)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Screenshots](#screenshots)
- [Lisensi](#lisensi)

## Fitur Utama

| Modul | Deskripsi |
|---|---|
| 👤 **Manajemen Penghuni** | CRUD penghuni dengan foto KTP, status kontrak/tetap, status pernikahan |
| 🏠 **Manajemen Rumah** | CRUD rumah, histori penghuni (timeline), assign/pindah penghuni |
| 💵 **Iuran & Tagihan** | Master jenis iuran, generate tagihan bulanan (idempotent), dukungan iuran tahunan |
| 💳 **Pembayaran** | Catat pembayaran, status tagihan otomatis jadi lunas |
| 🧾 **Pengeluaran** | Catat pengeluaran operasional RT dengan kategori bebas |
| 📊 **Dashboard & Laporan** | Grafik pemasukan vs pengeluaran per tahun, laporan detail per bulan |
| 🔐 **RBAC Granular** | 3 role (Admin, Bendahara, Warga), permission per-aksi, bukan hardcode |
| 🔑 **Autentikasi** | Login/logout via Laravel Sanctum (token, 24 jam, refresh) |
| 📝 **Activity Log** | Audit trail untuk aksi-aksi penting di aplikasi |

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Laravel 13.x, PHP 8.3 |
| Auth | Laravel Sanctum (token-based) |
| Database | MySQL 8.x |
| Testing backend | PHPUnit (Unit + Feature) |
| Frontend | React 19 + TypeScript + Vite |
| UI Kit | shadcn/ui (template shadcn-admin) |
| State/Data | Zustand (auth) + TanStack Query (server state) |
| Routing | TanStack Router |
| Chart | Recharts |
| Form | React Hook Form + Zod |
| Mock API (dev) | MSW (Mock Service Worker) |
| Testing frontend | Vitest + React Testing Library |
| E2E | Playwright |

## Struktur Repository

```
siwarga/
├── docker-compose.yml           # Stack development (Docker)
├── docker-compose.prd.yml       # Stack production (Docker)
├── .env.example                 # Env untuk kedua docker-compose di atas
├── src/
│   ├── backend/                 # Laravel API
│   │   ├── app/
│   │   │   ├── Http/Controllers/Api/   # API Controllers
│   │   │   ├── Http/Resources/         # API Resources
│   │   │   ├── Models/                 # Eloquent Models
│   │   │   ├── Policies/               # Authorization Policies
│   │   │   └── Services/               # Business logic (generate tagihan, laporan, dsb.)
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   └── seeders/
│   │   ├── routes/api.php
│   │   ├── tests/{Feature,Unit}/
│   │   ├── Dockerfile                  # Image development
│   │   └── Dockerfile.prd              # Image production
│   └── frontend/                 # React SPA (shadcn-admin)
│       ├── e2e/                        # Playwright specs
│       ├── src/
│       │   ├── features/               # Modul per domain (residents, houses, bills, dst.)
│       │   ├── hooks/                  # TanStack Query hooks
│       │   ├── services/               # API client layer
│       │   ├── mocks/                  # MSW handlers
│       │   ├── routes/                 # TanStack Router
│       │   └── stores/                 # Zustand
│       ├── Dockerfile                  # Image development
│       └── Dockerfile.prd              # Image production
└── docs/
    ├── PRD.md
    └── ERD.dbml
```

## Instalasi

SIWarga dirancang untuk berjalan **native, tanpa Docker sebagai basisnya** — Opsi 1 (development lokal) dan Opsi 3 (VPS production) sama-sama menjalankan PHP/Node/MySQL langsung di mesin. Docker (Opsi 2) disediakan hanya sebagai kemudahan opsional bagi yang sudah familiar dengan Docker dan tidak mau install dependency manual; keduanya menghasilkan aplikasi yang identik.

### Opsi 1 — Native Tanpa Docker (Development Lokal)

Panduan ini untuk menjalankan SIWarga langsung di laptop/komputer sendiri untuk keperluan development, tanpa Docker dan tanpa Nginx/systemd.

**Prasyarat** (install manual sesuai OS masing-masing):

| Kebutuhan | Versi | Cek dengan |
|---|---|---|
| PHP | 8.3 (+ ekstensi `mbstring`, `xml`, `bcmath`, `curl`, `zip`, `gd`, `tokenizer`, `pdo_mysql`) | `php -v` |
| Composer | 2.x | `composer --version` |
| Node.js | 20+ | `node -v` |
| MySQL | 8.x (server jalan di `localhost:3306`) | `mysql --version` |

> Belum punya salah satu di atas? Lihat langkah 2–5 di [Opsi 3](#opsi-3--native--manual-untuk-vps-production) untuk cara install PHP/Composer/Node/MySQL di Ubuntu — lewati bagian Nginx/systemd/PHP-FPM-nya.

#### 1. Clone repository & siapkan database

```bash
git clone https://github.com/rizalord/siwarga.git
cd siwarga

mysql -u root -p -e "CREATE DATABASE siwarga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 2. Setup & jalankan backend

```bash
cd src/backend
composer install

cp .env.example .env
php artisan key:generate
```

Edit `.env`, sesuaikan kredensial database (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`) dengan yang Anda buat di langkah 1.

```bash
php artisan migrate --seed
php artisan storage:link   # wajib, agar foto KTP penghuni bisa diakses

php artisan serve
```

Backend API berjalan di `http://localhost:8000`.

#### 3. Setup & jalankan frontend

Buka terminal baru:

```bash
cd src/frontend
npm install

cp .env.example .env
```

Pastikan `.env` berisi:

```ini
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false
```

```bash
npm run dev
```

Frontend berjalan di `http://localhost:5173` dengan hot reload. Buka di browser dan login dengan salah satu [akun demo](#akun-demo).

> Ingin coba tampilan frontend tanpa backend sama sekali? Set `VITE_USE_MOCK=true` di `.env` — data akan disimulasikan lewat MSW (Mock Service Worker), tidak perlu backend/MySQL jalan.

---

### Opsi 2 — Docker (Opsional)

Opsi ini murni kemudahan bagi yang sudah terbiasa dengan Docker — bukan cara resmi/wajib menjalankan SIWarga. Kalau ragu, pakai [Opsi 1](#opsi-1--native-tanpa-docker-development-lokal) di atas.

**Prasyarat:** [Docker Engine](https://docs.docker.com/engine/install/) & Docker Compose v2.

#### Development

Source code di-mount ke dalam container, jadi perubahan kode langsung ter-reload (Vite HMR di frontend, PHP re-interpret setiap request di backend) tanpa rebuild image.

```bash
git clone https://github.com/rizalord/siwarga.git
cd siwarga

cp .env.example .env
# generate APP_KEY dulu (opsional untuk dev, tapi disarankan):
docker compose run --rm backend php artisan key:generate --show
# tempel hasilnya ke APP_KEY= di .env

docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| MySQL | localhost:3306 |

Migration jalan otomatis saat container backend start. Jalankan seed data demo sekali secara manual:

```bash
docker compose exec backend php artisan db:seed
```

> **Foto KTP / storage:** symlink `public/storage` dibuat otomatis oleh container backend saat start dengan target **relatif** (`../storage/app/public`), sehingga valid dipakai bergantian dengan Opsi 1 (native). Kalau sebelumnya pernah menjalankan Opsi 1 dulu, hapus symlink lamanya sekali lalu biarkan container membuatnya ulang — lihat [Troubleshooting](#troubleshooting).

#### Production

Image production membangun backend jadi satu image php-fpm + nginx yang teroptimasi, dan frontend jadi static asset yang di-serve nginx — tidak ada bind mount, semuanya sudah di-bake ke image saat build.

```bash
cp .env.example .env
# APP_KEY WAJIB di-set untuk production:
docker compose run --rm backend php artisan key:generate --show
# tempel hasilnya ke APP_KEY= di .env, lalu sesuaikan kredensial DB & domain

docker compose -f docker-compose.prd.yml up --build -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:8000 |

> `VITE_API_URL` dan `VITE_USE_MOCK` di-bake ke bundle frontend saat **build image** (build arg), bukan saat runtime. Kalau nilainya berubah (misal ganti domain API), rebuild ulang: `docker compose -f docker-compose.prd.yml build frontend`.

Perintah operasional yang umum dipakai:

```bash
# Lihat log
docker compose -f docker-compose.prd.yml logs -f backend

# Jalankan artisan command
docker compose -f docker-compose.prd.yml exec backend php artisan migrate --force

# Seed data awal (sekali saja)
docker compose -f docker-compose.prd.yml exec backend php artisan db:seed --force
```

---

### Opsi 3 — Native / Manual (untuk VPS Production)

Panduan ini untuk deploy langsung di server (VPS) tanpa Docker: PHP-FPM + Nginx + MySQL native. Setiap langkah runtut dari server kosong sampai aplikasi bisa diakses. Contoh di bawah pakai Ubuntu 22.04/24.04; sesuaikan nama package kalau pakai distro lain.

> Untuk development di laptop sendiri, gunakan [Opsi 1](#opsi-1--native-tanpa-docker-development-lokal) — lebih ringkas.

#### 1. Update sistem & install dependency dasar

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip software-properties-common
```

#### 2. Install PHP 8.3 + ekstensi yang dibutuhkan

```bash
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.3 php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring \
    php8.3-xml php8.3-bcmath php8.3-curl php8.3-zip php8.3-gd php8.3-tokenizer

php -v   # pastikan PHP 8.3.x
```

#### 3. Install Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

#### 4. Install Node.js 20+ & npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

#### 5. Install & setup MySQL 8

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

sudo mysql -u root -p
```

Di dalam prompt MySQL:

```sql
CREATE DATABASE siwarga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'siwarga'@'localhost' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON siwarga.* TO 'siwarga'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### 6. Install Nginx

```bash
sudo apt install -y nginx
```

#### 7. Clone repository & setup backend

```bash
sudo mkdir -p /var/www/siwarga
sudo chown $USER:$USER /var/www/siwarga
git clone https://github.com/rizalord/siwarga.git /var/www/siwarga
cd /var/www/siwarga/src/backend

composer install --optimize-autoloader
```

> `fakerphp/faker` ada di `require-dev`, tapi seeder demo data (mis. `ResidentSeeder`) memakai helper `fake()` yang butuh package ini. Jangan pakai `--no-dev` di sini kalau kamu berencana menjalankan `migrate --seed`.

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`, sesuaikan minimal bagian berikut:

```ini
APP_NAME=SIWarga
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.domain-anda.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=siwarga
DB_USERNAME=siwarga
DB_PASSWORD=GANTI_DENGAN_PASSWORD_KUAT
```

Lanjutkan setup:

```bash
php artisan migrate --seed
php artisan storage:link

# Cache config/route untuk production (skip untuk development)
php artisan config:cache
php artisan route:cache

# Permission agar Nginx/PHP-FPM bisa menulis storage & cache
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

#### 8. Konfigurasi PHP-FPM pool (opsional, disesuaikan kapasitas server)

Pool default `www` biasanya sudah cukup untuk skala RT (puluhan rumah). Kalau perlu isolasi user, buat pool baru di `/etc/php/8.3/fpm/pool.d/siwarga.conf` mengikuti contoh pool `www.conf`, lalu:

```bash
sudo systemctl restart php8.3-fpm
```

#### 9. Konfigurasi Nginx untuk backend (API)

Buat `/etc/nginx/sites-available/siwarga-api`:

```nginx
server {
    listen 80;
    server_name api.domain-anda.com;
    root /var/www/siwarga/src/backend/public;
    index index.php;

    client_max_body_size 20m;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/siwarga-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 10. Build & deploy frontend

```bash
cd /var/www/siwarga/src/frontend
npm install

cp .env.example .env
```

Edit `.env`:

```ini
VITE_API_URL=https://api.domain-anda.com
VITE_USE_MOCK=false
```

Build untuk production:

```bash
npm run build   # hasil static di ./dist
```

Buat `/etc/nginx/sites-available/siwarga-app`:

```nginx
server {
    listen 80;
    server_name app.domain-anda.com;
    root /var/www/siwarga/src/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|svg|png|jpg|jpeg|gif|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/siwarga-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 11. HTTPS dengan Let's Encrypt (sangat disarankan untuk production)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.domain-anda.com -d app.domain-anda.com
```

Certbot otomatis mengubah konfigurasi Nginx di atas untuk redirect ke HTTPS dan setup auto-renewal.

#### 12. Selesai — verifikasi

```bash
curl -I https://api.domain-anda.com/api/auth/login
```

Buka `https://app.domain-anda.com` di browser dan login dengan [akun demo](#akun-demo) (segera ganti password setelah login pertama untuk penggunaan production).

## Troubleshooting

### `403 Forbidden` (atau `404`) saat mengakses `/storage/*` — mis. foto KTP tidak tampil

Penyebab paling umum: symlink `public/storage` menunjuk ke path absolut host (dibuat oleh `php artisan storage:link` saat menjalankan Opsi 1 native), sedangkan path tersebut tidak ada di dalam container Docker — jadi symlink patah.

Cek dan perbaiki (buat dengan path **relatif** supaya valid di native maupun Docker):

```bash
cd src/backend
ls -la public/storage                  # lihat target symlink saat ini
rm -f public/storage
ln -s ../storage/app/public public/storage
```

Setelah itu refresh halaman dan pastikan storage sudah bisa diakses:

```bash
curl -I http://localhost:8000/storage/ktp-photos/<nama-file>.jpg   # harus 200
```

Pada workflow Docker, symlink ini juga dibuat ulang otomatis setiap container backend start, jadi cukup diperbaiki sekali saja.

## Akun Demo

Seeder (`php artisan migrate --seed` atau `db:seed`) otomatis membuat 3 akun (satu per role) beserta data demo yang realistis: 20 rumah (15 tetap dihuni, 3 kontrak dihuni, 2 kosong), 18 penghuni, tagihan 3 bulan terakhir (sebagian sudah lunas), serta pengeluaran operasional.

| Role | Email | Password | Akses |
|---|---|---|---|
| Admin | `admin@siwarga.test` | `password` | Akses penuh |
| Bendahara | `bendahara@siwarga.test` | `password` | Kelola pembayaran, pengeluaran, laporan |
| Warga | `warga@siwarga.test` | `password` | Hanya lihat tagihan & pembayaran miliknya sendiri |

## API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/login` | Login → token (24 jam) + user + permissions |
| POST | `/api/auth/logout` | Revoke token aktif |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | User saat ini + permissions |
| `GET/POST/PUT/DELETE` | `/api/residents` | CRUD penghuni |
| `GET/POST/PUT/DELETE` | `/api/houses` | CRUD rumah |
| GET | `/api/houses/{id}/history` | Histori penghuni rumah |
| POST | `/api/houses/{id}/assign-resident` | Assign penghuni ke rumah |
| POST | `/api/houses/{id}/vacate-resident` | Kosongkan rumah (tutup histori hunian) |
| `GET/POST/PUT/DELETE` | `/api/due-types` | CRUD jenis iuran |
| `GET/POST/DELETE` | `/api/bills` | List, generate, hapus tagihan |
| `GET/POST/PUT/DELETE` | `/api/payments` | List, catat, hapus pembayaran |
| `GET/POST/PUT/DELETE` | `/api/expenses` | CRUD pengeluaran |
| GET | `/api/reports/summary/{year}` | Ringkasan grafik tahunan + saldo |
| GET | `/api/reports/monthly/{year}/{month}` | Laporan detail bulanan |
| `GET/POST/PUT/DELETE` | `/api/users` | CRUD user (Admin only) |
| `GET/POST/PUT/DELETE` | `/api/roles`, `/api/permissions` | Kelola role & permission (Admin only) |
| GET | `/api/activity-logs` | Audit trail |

## Testing

```bash
# Backend (PHPUnit)
cd src/backend
php artisan test

# Frontend (Vitest)
cd src/frontend
npm run test              # sekali jalan
npm run test:watch        # watch mode
npm run test:coverage     # dengan coverage report

# E2E (Playwright) — backend & frontend harus jalan
npx playwright install    # sekali saja
npx playwright test
npx playwright test e2e/siwarga/auth.spec.ts   # satu spec saja
```

## Screenshots

| | |
|---|---|
| ![Login](docs/screenshots/login.png) Login | ![Dashboard](docs/screenshots/dashboard.png) Dashboard |
| ![Penghuni](docs/screenshots/residents.png) Daftar Penghuni | ![Rumah](docs/screenshots/houses.png) Daftar Rumah |
| ![Detail Rumah](docs/screenshots/house-detail.png) Detail Rumah + Histori | ![Jenis Iuran](docs/screenshots/due-types.png) Jenis Iuran |
| ![Tagihan](docs/screenshots/bills.png) Tagihan | ![Pembayaran](docs/screenshots/payments.png) Pembayaran |
| ![Pengeluaran](docs/screenshots/expenses.png) Pengeluaran | ![Kategori Pengeluaran](docs/screenshots/expense-categories.png) Kategori Pengeluaran |
| ![Laporan](docs/screenshots/reports.png) Laporan Bulanan | ![User](docs/screenshots/users.png) Manajemen User |
| ![Role](docs/screenshots/roles.png) Manajemen Role | ![Permission](docs/screenshots/permissions.png) Manajemen Permission |
| ![Log Aktivitas](docs/screenshots/activity-logs.png) Log Aktivitas | |

## Lisensi

Proyek ini dibuat untuk keperluan **Skill Fit Test — PT Beon Intermedia (JagoanHosting)**, dan dilanjutkan sebagai aplikasi produksi untuk perumahan pribadi penulis.

---

<div align="center">

**Dibuat dengan ❤️ oleh Ahmad Rizal Khamdani**

</div>
