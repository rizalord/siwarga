# SIWarga — Sistem Informasi Manajemen Administrasi RT

Aplikasi web untuk mengelola administrasi RT: penghuni, rumah, iuran bulanan, pembayaran, pengeluaran, dan laporan keuangan. Dibangun dengan arsitektur **API-first (decoupled)** — backend Laravel dan frontend React SPA terpisah.

![SIWarga Dashboard](docs/screenshots/dashboard.png)

## Fitur Utama

- **Manajemen Penghuni** — CRUD penghuni dengan foto KTP, status kontrak/tetap
- **Manajemen Rumah** — CRUD rumah, histori penghuni (timeline), assign penghuni
- **Iuran & Tagihan** — Master jenis iuran, generate tagihan bulanan (idempotent)
- **Pembayaran** — Catat pembayaran, status tagihan otomatis lunas
- **Pengeluaran** — Catat pengeluaran operasional RT
- **Dashboard & Laporan** — Grafik pemasukan vs pengeluaran, laporan bulanan
- **RBAC** — 3 role: Admin, Bendahara, Warga dengan permission granular
- **Autentikasi** — Login/Logout via Laravel Sanctum (token-based, refresh token)

## Tech Stack

### Backend
- **Framework:** Laravel 13.x
- **Auth:** Laravel Sanctum (token-based, 24h expiry)
- **Database:** MySQL 8.x (SQLite default untuk development)
- **Testing:** PHPUnit (Unit + Feature)

### Frontend
- **Framework:** React 19 + TypeScript + Vite
- **UI Kit:** shadcn/ui (shadcn-admin template)
- **State Management:** Zustand (auth) + TanStack Query (data fetching)
- **Routing:** TanStack Router
- **Chart:** Recharts
- **Forms:** React Hook Form + Zod
- **Mock API (dev):** MSW (Mock Service Worker)

### Testing
- **Backend:** PHPUnit (Unit + Feature)
- **Frontend:** Vitest + React Testing Library (unit/integration)
- **E2E:** Playwright

## Prerequisites

- PHP 8.3+ dengan ekstensi: `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `gd`, `json`, `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `zip`
- Composer 2.x
- Node.js 20+ dan npm/pnpm
- MySQL 8.x (atau SQLite untuk development)
- Git

## Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/rizalord/siwarga.git
cd siwarga
```

### 2. Backend Setup

```bash
cd src/backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Konfigurasi database di .env (default: SQLite)
# Untuk MySQL, sesuaikan:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=siwarga
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations & seeders
php artisan migrate --seed

# Jalankan server development
php artisan serve
```

Backend akan berjalan di `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd src/frontend

# Install dependencies
npm install

# Copy environment file (opsional, sudah ada .env)
cp .env.example .env

# Edit .env untuk backend URL:
# VITE_API_URL=http://localhost:8000
# VITE_USE_MOCK=false  # Ubah ke false untuk real API

# Jalankan development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`.

### 4. Default Admin Credential

Setelah seeding (`php artisan db:seed`), akun default:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@siwarga.test` | `password` |

## Struktur Repository

```
siwarga/
├── src/
│   ├── backend/                 # Laravel API
│   │   ├── app/
│   │   │   ├── Http/Controllers/Api/   # API Controllers
│   │   │   ├── Http/Resources/         # API Resources
│   │   │   ├── Models/                 # Eloquent Models
│   │   │   ├── Policies/               # Authorization Policies
│   │   │   └── Services/               # Business Logic
│   │   ├── database/
│   │   │   ├── migrations/             # Schema migrations
│   │   │   └── seeders/                # Default data (roles, permissions)
│   │   ├── routes/
│   │   │   └── api.php                 # All API routes
│   │   └── tests/
│   │       ├── Feature/Api/            # Feature tests
│   │       └── Unit/                   # Unit tests
│   └── frontend/                 # React SPA (shadcn-admin)
│       ├── e2e/                         # Playwright E2E tests
│       ├── src/
│       │   ├── features/                # Feature modules (residents, houses, bills, etc.)
│       │   ├── hooks/                   # TanStack Query hooks
│       │   ├── services/                # API client layer
│       │   ├── mocks/                   # MSW mock handlers
│       │   ├── routes/                  # TanStack Router routes
│       │   ├── stores/                  # Zustand stores
│       │   └── types/                   # TypeScript API contracts
│       └── tests/                       # Vitest tests
├── docs/
│   ├── PRD.md                          # Product Requirements Document
│   ├── siwarga-erd.dbml                # ERD diagram
│   └── superpowers/                    # Design & implementation plans
└── README.md
```

## API Endpoints Summary

### Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → token (24h) + user |

### Protected (auth:sanctum)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/logout` | Revoke current token |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Current user + permissions |
| GET/POST/PUT/DELETE | `/api/residents` | CRUD penghuni |
| GET/POST/PUT/DELETE | `/api/houses` | CRUD rumah |
| GET | `/api/houses/{id}/history` | Histori penghuni |
| POST | `/api/houses/{id}/assign-resident` | Assign penghuni ke rumah |
| GET/POST/PUT/DELETE | `/api/due-types` | CRUD jenis iuran |
| GET/POST/DELETE | `/api/bills` | List, generate, delete tagihan |
| GET/POST/DELETE | `/api/payments` | List, create, delete pembayaran |
| GET/POST/PUT/DELETE | `/api/expenses` | CRUD pengeluaran |
| GET | `/api/reports/summary?year=...` | Ringkasan tahunan |
| GET | `/api/reports/monthly/{year}/{month}` | Laporan bulanan |
| GET/POST/PUT/DELETE | `/api/users` | CRUD user (Admin only) |

## Testing

### Backend (PHPUnit)

```bash
cd src/backend
php artisan test
```

### Frontend (Vitest)

```bash
cd src/frontend
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### E2E (Playwright)

```bash
cd src/frontend

# Install Playwright browsers (once)
npx playwright install

# Run E2E tests (backend & frontend harus running)
npx playwright test

# Run specific test
npx playwright test e2e/siwarga/auth.spec.ts
```

## Screenshots

> 📸 Screenshot setiap fitur akan ditambahkan di folder `docs/screenshots/`.

- [Dashboard](docs/screenshots/dashboard.png)
- [Daftar Penghuni](docs/screenshots/residents.png)
- [Daftar Rumah](docs/screenshots/houses.png)
- [Detail Rumah + Histori](docs/screenshots/house-detail.png)
- [Tagihan](docs/screenshots/bills.png)
- [Pembayaran](docs/screenshots/payments.png)
- [Pengeluaran](docs/screenshots/expenses.png)
- [Manajemen User](docs/screenshots/users.png)

## Development Notes

### Environment Variables

**Backend (`.env`)**
```ini
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=siwarga
DB_USERNAME=root
DB_PASSWORD=
```

**Frontend (`.env`)**
```ini
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=false   # true = MSW mock, false = real API
```

### Mock API Development

Jika backend belum siap, frontend bisa dijalankan dengan MSW mock:

```bash
cd src/frontend
VITE_USE_MOCK=true npm run dev
```

Semua API akan di-mock dengan data dummy.

## Deployment

Aplikasi siap dideploy secara **native (tanpa Docker)** sesuai ketentuan skill test:

1. Setup backend di server (PHP 8.3 + MySQL) — ikuti langkah Backend Setup di atas
2. Build frontend: `npm run build` → hasil di `dist/`
3. Serve frontend dengan web server (Nginx/Apache) atau gunakan Vite preview

## Lisensi

Proyek ini dibuat untuk keperluan **Skill Fit Test — PT Beon Intermedia (JagoanHosting)** dan juga sebagai aplikasi produksi untuk perumahan pribadi.

## Kontribusi

Untuk laporan bug atau saran fitur, silakan buka issue di repository.

---

**Dibuat dengan ❤️ oleh Ahmad**
