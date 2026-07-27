# SIWarga — Design Document

| | |
|---|---|
| **Proyek** | SIWarga — Sistem Informasi Manajemen Administrasi RT |
| **Tanggal** | 27 Juli 2026 |
| **Status** | Approved |
| **Arsitektur** | API-only Backend + SPA Frontend (decoupled) |

---

## 1. Arsitektur

### High-Level Architecture

```
┌─────────────────────────────────┐     REST API (JSON)     ┌──────────────────────────────┐
│  Frontend (shadcn-admin)        │ ◄──────────────────────► │  Backend (Laravel 13)        │
│  ┌───────────────────────────┐  │    Bearer Token Auth     │  ┌────────────────────────┐  │
│  │ Dev: MSW Service Worker  │  │                          │  │ API Routes (/api/*)   │  │
│  │ Prod: Axios → Laravel    │  │                          │  │ Controllers            │  │
│  │        API Client        │  │                          │  │ Services (Business    │  │
│  └───────────────────────────┘  │                          │  │   Logic)               │  │
│  TanStack Query                │                          │  │ Models + Migrations   │  │
│  TanStack Router               │                          │  │ Sanctum Auth          │  │
│  Zustand (auth state)          │                          │  │ Policies (RBAC)       │  │
└─────────────────────────────────┘                          └──────────────────────────────┘
```

### Tech Stack

| Layer | Teknologi |
|---|---|
| Backend framework | Laravel 13.x (tanpa Inertia — API-only) |
| Auth | Laravel Sanctum (token-based, 24h expiry) + Fortify |
| Database | MySQL 8.x |
| Frontend | React 19 + TypeScript + Vite |
| UI Kit | shadcn/ui — template **shadcn-admin** |
| Routing | TanStack Router |
| Data fetching | TanStack Query + Axios |
| State management | Zustand (auth only) |
| Charting | Recharts |
| Form handling | React Hook Form + Zod |
| Mock API (dev) | MSW (Mock Service Worker) |
| Backend testing | PHPUnit |
| Frontend testing | Vitest + React Testing Library |
| E2E testing | Playwright |

### Data Flow (API Contract-First)

1. Tipe/interface didefinisikan di `src/types/api.ts` (frontend) — single source of truth
2. MSW handlers dibuat berdasarkan tipe yang sama — frontend bisa develop tanpa backend
3. Service layer (`src/services/*.ts`) memanggil endpoint API — MSW intercept di dev
4. Backend mengimplementasikan controller yang return JSON sesuai kontrak tipe
5. Saat backend API siap, MSW di-nonaktifkan, request langsung ke backend

### Directory Structure

```
siwarga/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Http/Resources/     # API Resources
│   │   ├── Models/
│   │   ├── Services/           # Business logic
│   │   └── Policies/           # RBAC authorization
│   ├── database/migrations/
│   └── database/seeders/
├── frontend/
│   ├── src/
│   │   ├── types/api.ts           # API contracts
│   │   ├── services/              # API client calls
│   │   │   ├── auth.ts
│   │   │   ├── residents.ts
│   │   │   ├── houses.ts
│   │   │   ├── bills.ts
│   │   │   ├── payments.ts
│   │   │   ├── expenses.ts
│   │   │   └── reports.ts
│   │   ├── mocks/
│   │   │   ├── handlers/          # MSW handlers
│   │   │   └── data/              # Mock data fixtures
│   │   ├── hooks/                 # TanStack Query hooks
│   │   ├── routes/                # TanStack Router pages
│   │   └── components/            # Shared components
│   └── e2e/                       # Playwright tests
└── docs/
    └── siwarga-erd.dbml
```

---

## 2. Autentikasi & RBAC

### Alur Login

1. User submit email + password ke `POST /api/auth/login`
2. Backend validasi → return `{ user, token }`
3. Token disimpan di cookie (via zustand store)
4. Axios interceptor pasang `Authorization: Bearer <token>` di setiap request
5. Logout → `POST /api/auth/logout` → revoke token → hapus dari store

### Refresh Token

- Access token expiry: 24 jam
- Interceptor 401: panggil `POST /api/auth/refresh` → revoke old → create new → retry
- Maksimal 5 active sessions per user
- Jika refresh gagal → redirect ke `/sign-in`

### Auth Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Login → token + user |
| POST | `/api/auth/logout` | Revoke current token |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/me` | Current user + permissions |

### Frontend Route Protection

- Layout `_authenticated` di TanStack Router — cek token dari auth store
- Redirect ke `/sign-in` jika tidak ada token
- Sidebar menu dinamis berdasarkan permission user

### RBAC Structure

3 default roles (seeded):

| Role | Permissions |
|------|-------------|
| **Admin** | Semua permissions |
| **Bendahara** | `bills.*`, `payments.*`, `expenses.*`, `reports.*`, `houses.view` |
| **Warga** | `bills.view` (own house), `payments.view` (own house) |

Permission format: `{module}.{action}` — contoh: `residents.create`, `bills.generate`, `reports.view`.

Frontend guard: Sidebar menu filtering by permissions.
Backend guard: Laravel Policy per-modul.

---

## 3. Database (ERD)

Mengikuti skema di `docs/siwarga-erd.dbml`:

### Entitas Utama

- `residents` — data penghuni (soft delete)
- `houses` — data rumah (soft delete)
- `house_residents` — pivot + histori hunian (soft delete)
- `due_types` — jenis iuran (soft delete)
- `bills` — tagihan per periode (soft delete)
- `payments` — pembayaran (soft delete)
- `expenses` — pengeluaran (soft delete)

### RBAC

- `users` — user login (soft delete)
- `roles` — role definitions
- `permissions` — granular permissions
- `role_permissions` — pivot
- `user_roles` — pivot

### Soft Delete

Semua model utama memiliki `deleted_at` (soft delete) — data tidak pernah dihapus permanen dari database.

---

## 4. Modul & Fitur

### 4.1 Manajemen Penghuni (Admin only)

| Route | Halaman |
|-------|---------|
| `/residents` | Daftar penghuni (tabel + filter status + search) |
| `/residents/new` | Tambah penghuni (form + upload foto KTP) |
| `/residents/:id` | Detail penghuni + histori rumah |
| `/residents/:id/edit` | Edit penghuni |

**Fitur:** Upload foto KTP, filter status kontrak/tetap, preview foto sebelum submit.

### 4.2 Manajemen Rumah (Admin only)

| Route | Halaman |
|-------|---------|
| `/houses` | Daftar rumah (tabel + filter dihuni/kosong) |
| `/houses/new` | Tambah rumah |
| `/houses/:id` | Detail rumah + timeline histori penghuni |
| `/houses/:id/edit` | Edit rumah |

**Fitur:** Assign penghuni → otomatis close previous resident's `end_date`, status dihuni/kosong otomatis dari `house_residents` aktif.

### 4.3 Iuran & Tagihan (Admin & Bendahara)

| Route | Halaman |
|-------|---------|
| `/due-types` | Master jenis iuran (CRUD) |
| `/bills` | Daftar tagihan (filter bulan, status, rumah) |
| Tombol "Generate" | Trigger generate tagihan bulan berjalan |

**Generate logic:**
- Idempotent: skip jika bill sudah ada untuk kombinasi house + due_type + period
- 15 rumah tetap → selalu generate
- 5 rumah kontrak/kosong → generate hanya jika ada `house_residents` aktif
- Kebersihan bisa tahunan (1 tagihan = 12 bulan), Satpam default bulanan

### 4.4 Pembayaran (Admin & Bendahara)

| Route | Halaman |
|-------|---------|
| `/payments` | Histori pembayaran |
| Tombol "Bayar" di row tagihan | Catat pembayaran (modal) |

**Fitur:** Input nominal (pre-filled), tanggal, catatan. Status tagihan otomatis jadi "lunas" jika amount_paid >= amount_due.

### 4.5 Pengeluaran (Admin & Bendahara)

| Route | Halaman |
|-------|---------|
| `/expenses` | Daftar pengeluaran (filter bulan, kategori) |
| `/expenses/new` | Catat pengeluaran |

### 4.6 Dashboard & Laporan (Admin & Bendahara)

| Route | Halaman |
|-------|---------|
| `/` | Dashboard ringkasan (grafik tahunan, saldo) |
| `/reports/monthly/:year/:month` | Laporan detail bulanan |

**Dashboard content:**
- Kartu saldo berjalan
- Grafik bar pemasukan vs pengeluaran per bulan (filter tahun — Recharts)
- Ringkasan pemasukan & pengeluaran bulan berjalan

### 4.7 Manajemen User (Admin only)

| Route | Halaman |
|-------|---------|
| `/users` | Daftar user |
| `/users/new` | Tambah user + assign role |
| `/users/:id/edit` | Edit user/role |

---

## 5. API Endpoints

### Auth

| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/auth/login` | Public | - |
| POST | `/api/auth/logout` | Sanctum | All authenticated |
| POST | `/api/auth/refresh` | Sanctum | All authenticated |
| GET | `/api/auth/me` | Sanctum | All authenticated |

### Residents

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/residents` | Admin |
| POST | `/api/residents` | Admin |
| GET | `/api/residents/{id}` | Admin |
| PUT | `/api/residents/{id}` | Admin |
| DELETE | `/api/residents/{id}` | Admin |

### Houses

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/houses` | Admin |
| POST | `/api/houses` | Admin |
| GET | `/api/houses/{id}` | Admin, Bendahara |
| PUT | `/api/houses/{id}` | Admin |
| DELETE | `/api/houses/{id}` | Admin |
| GET | `/api/houses/{id}/history` | Admin, Bendahara |
| POST | `/api/houses/{id}/assign-resident` | Admin |

### Due Types

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/due-types` | Admin, Bendahara |
| POST | `/api/due-types` | Admin |
| PUT | `/api/due-types/{id}` | Admin |
| DELETE | `/api/due-types/{id}` | Admin |

### Bills

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/bills` | Admin, Bendahara, Warga (scoped) |
| POST | `/api/bills/generate` | Admin, Bendahara |
| GET | `/api/bills/{id}` | Admin, Bendahara, Warga (scoped) |

### Payments

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/payments` | Admin, Bendahara, Warga (scoped) |
| POST | `/api/payments` | Admin, Bendahara |
| GET | `/api/payments/{id}` | Admin, Bendahara, Warga (scoped) |

### Expenses

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/expenses` | Admin, Bendahara |
| POST | `/api/expenses` | Admin, Bendahara |
| GET | `/api/expenses/{id}` | Admin, Bendahara |
| PUT | `/api/expenses/{id}` | Admin, Bendahara |
| DELETE | `/api/expenses/{id}` | Admin, Bendahara |

### Reports

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/reports/summary?year={year}` | Admin, Bendahara |
| GET | `/api/reports/monthly/{year}/{month}` | Admin, Bendahara |

### Users & Roles

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| PUT | `/api/users/{id}` | Admin |
| DELETE | `/api/users/{id}` | Admin |
| GET | `/api/roles` | Admin |
| POST | `/api/roles` | Admin |
| GET | `/api/permissions` | Admin |

---

## 6. UI Routing (Frontend)

```
/                           → Dashboard (Recharts graph + saldo)
/sign-in                    → Login page
/sign-up                    → Register (optional, bisa dari panel admin)
/residents                  → Daftar penghuni
/residents/new              → Tambah penghuni
/residents/:id              → Detail penghuni
/residents/:id/edit         → Edit penghuni
/houses                     → Daftar rumah
/houses/new                 → Tambah rumah
/houses/:id                 → Detail rumah + histori
/houses/:id/edit            → Edit rumah
/due-types                  → Master jenis iuran
/bills                      → Daftar tagihan
/payments                   → Histori pembayaran
/expenses                   → Daftar pengeluaran
/expenses/new               → Catat pengeluaran
/reports/monthly/:year/:month  → Laporan detail bulanan
/users                      → Manajemen user (Admin)
/settings/account           → Profil sendiri
```

Semua route di atas kecuali `/sign-in` dan `/sign-up` berada di bawah layout `_authenticated`.

---

## 7. API Contract (TypeScript Types)

Semua response memiliki wrapper:

```typescript
interface ApiResponse<T> {
  data: T
  message?: string
}

interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
```

Setiap model memiliki `created_at`, `updated_at`, `deleted_at` (string | null). Detail tipe per modul ada di file `frontend/src/types/api.ts`.

---

## 8. Testing Strategy

### Backend (PHPUnit)

- **Unit test**: Business logic Services (generate bill, kalkulasi status rumah)
- **Feature test**: Endpoint API end-to-end dengan RefreshDatabase
- Prioritas skenario: generate tagihan idempotent, RBAC 403, pindah penghuni histori

### Frontend (Vitest + RTL)

- **Unit test**: Validasi form (Zod), formatting (rupiah, tanggal)
- **Integration test**: Alur form dengan MSW mock API

### E2E (Playwright)

1. Login Admin → tambah penghuni → muncul di list
2. Tambah rumah → assign penghuni → histori tampil benar
3. Generate tagihan → muncul dengan status "belum lunas"
4. Catat pembayaran → status berubah jadi "lunas"
5. Login Warga → hanya melihat tagihan sendiri
6. Dashboard grafik sesuai data

---

## 9. Rencana Kerja

### Fase 1 — Foundation (Frontend API Contracts + Mock)
- Definisikan semua tipe TypeScript di `src/types/api.ts`
- Setup MSW handlers untuk semua endpoint
- Setup service layer (Axios instance, interceptor, refresh token)
- Token auth store + login/logout flow

### Fase 2 — Frontend Modules (Dummy Data)
- Modul Penghuni (Residents): tabel, form, detail
- Modul Rumah (Houses): tabel, form, detail, histori timeline
- Modul Jenis Iuran & Tagihan: CRUD due types, generate, list bills
- Modul Pembayaran: catat bayar, histori
- Modul Pengeluaran: CRUD expenses
- Dashboard & Laporan: Recharts grafik, laporan bulanan
- Modul User Management: CRUD users, assign role
- Sidebar menu dinamis berdasarkan role

### Fase 3 — Backend API (Laravel)
- Migration + Model sesuai ERD (soft delete)
- Seeder: roles, permissions, due_types, default admin user
- Controller + API Resource untuk semua endpoint
- Service: generateBill logic
- Policy: RBAC per-modul
- Sanctum auth setup

### Fase 4 — Integrasi
- Swap MSW → real API
- Tes integrasi frontend-backend
- Bug fixing

### Fase 5 — Testing & Dokumentasi
- Backend PHPUnit tests
- Frontend Vitest tests
- E2E Playwright tests
- README instalasi lengkap
- Validasi instalasi dari clone bersih

---

## 10. Catatan

- Semua model menggunakan soft delete (`deleted_at`)
- Laravel dijalankan API-only (Inertia dihapus/dinonaktifkan)
- Frontend menggunakan MSW untuk mock saat development backend belum siap
- Tidak ada payment gateway — transaksi dicatat manual oleh bendahara
- Tidak ada notifikasi otomatis (WhatsApp/email)
