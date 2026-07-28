# SIWarga v1 — Gap Closure Plan

| | |
|---|---|
| **Proyek** | SIWarga — Sistem Informasi Manajemen Administrasi RT |
| **Tanggal** | 28 Juli 2026 |
| **Status** | Draft |
| **Tipe** | Bug fixes & gap closure for v1 |

---

## 1. Ringkasan

Berdasarkan gap analysis terhadap PRD, design spec, dan implementation plan yang sudah ada, ditemukan **13 gap** yang terbagi dalam 3 kategori. Dokumen ini merinci perbaikan untuk setiap gap.

---

## 2. Daftar Gap

### 🔴 Critical (harus selesai)

| # | Gap | Dampak | Area |
|---|------|--------|------|
| C1 | RBAC policies tidak di-enforce | User manapun bisa akses endpoint manapun | Backend |
| C2 | AuthController return `permissions: []` | Frontend tidak tahu permission user | Backend |
| C3 | `getAllPermissions()` tidak ada di User model | Error jika dipanggil | Backend |
| C4 | Dashboard route import dari module salah | Dashboard template generic, bukan SIWarga | Frontend |
| C5 | Frontend houses service endpoint mismatch | 404 saat panggil history & assign | Frontend |
| C6 | Frontend reports service endpoint mismatch | 404 saat panggil laporan | Frontend |
| C7 | Tidak ada default admin user seeder | Tidak bisa login pertama kali | Backend |

### 🟡 Moderate (prioritas tinggi)

| # | Gap | Dampak | Area |
|---|------|--------|------|
| M1 | DueTypeSeeder tidak ada | Tidak ada jenis iuran default | Backend |
| M2 | Tidak ada RBAC/403 test | Regression risk | Backend |
| M3 | Tidak ada Warga scope test | Regression risk | Backend |
| M4 | House status auto-sync | Status tidak akurat saat kosong | Backend |

### 🟢 Enhancement (nilai tambah)

| # | Gap | Dampak | Area |
|---|------|--------|------|
| E1 | Vitest browser provider error | Unit test tidak bisa dijalankan | Frontend |
| E2 | CI/CD (GitHub Actions) | Tidak ada automated testing di push | Opsional |

---

## 3. Rencana Perbaikan

### Task 1: Fix RBAC Enforcement & Permissions (Backend)

**Lokasi:** Backend controllers & routes

**Perubahan:**
1. **User model** — Hapus method `permissions()` yang salah (langsung ke `role_permissions`). Tambah method `getAllPermissions()` yang benar: load dari roles → role_permissions.
2. **AuthController:login** — Ubah `permissions: []` jadi `permissions: $user->getAllPermissions()`
3. **AuthController:me** — Ubah `permissions: []` jadi `permissions: $user->getAllPermissions()`
4. **Semua controller** — Tambah `__construct()` dengan middleware `can:xxx` sesuai policy masing-masing
5. **Atau alternatif:** Pasang middleware per route di `api.php`

**Detail routes yang perlu middleware:**

| Route | Permission |
|-------|-----------|
| `residents.*` | `residents.view` (index/show), `residents.create` (store), `residents.edit` (update), `residents.delete` (destroy) |
| `houses.*` | `houses.view`, `houses.create`, `houses.edit`, `houses.delete` |
| `houses.assign-resident` | `houses.assign` |
| `due-types.*` | `due-types.view`, `due-types.manage` |
| `bills.*` | `bills.view` |
| `bills.generate` | `bills.generate` |
| `payments.*` | `payments.view`, `payments.create` |
| `expenses.*` | `expenses.view`, `expenses.create`, `expenses.edit`, `expenses.delete` |
| `reports.*` | `reports.view` |
| `users.*` | `users.view`, `users.manage` |

### Task 2: Fix Frontend Service Endpoints

**Lokasi:** Frontend services

**Perubahan:**
1. **`services/houses.ts`**:
   - `getResidents()` → ubah URL dari `/api/houses/${id}/residents` ke `/api/houses/${id}/history`
   - `assignResident()` → ubah URL dari `/api/houses/${id}/residents` ke `/api/houses/${id}/assign-resident`
2. **`services/reports.ts`**:
   - `getMonthly()` → ubah dari `/api/reports/monthly?year=&month=` ke `/api/reports/monthly/${year}/${month}`
   - `getYearly()` → ubah dari `/api/reports/yearly?year=` ke `/api/reports/summary/${year}`

### Task 3: Fix Dashboard Route & Seeders

**Lokasi:** Frontend routes + Backend seeders

**Perubahan:**
1. **`/_authenticated/index.tsx`** — Ganti import dari `@/features/dashboard` ke `@/features/siwarga-dashboard`
2. **Buat `DueTypeSeeder.php`** — Seed 2 due types:
   - Iuran Satpam: Rp100.000, bulanan
   - Iuran Kebersihan: Rp15.000, bulanan
3. **Buat default user di `DatabaseSeeder.php`** — Tambah user admin:
   - name: 'Admin RT', email: 'admin@siwarga.test', password: 'password', role: admin
4. **Panggil DueTypeSeeder** dari DatabaseSeeder

### Task 4: House Status Auto-Sync (Backend)

**Lokasi:** House model / controller

**Perubahan:**
1. **House model** — Tambah boot() method dengan `saved` event:
   - Cek apakah house masih punya `houseResidents` tanpa end_date
   - Jika tidak ada, set status ke 'kosong'
   - Jika ada, set status ke 'dihuni'
2. Atau bisa via observer untuk lebih clean

### Task 5: Missing Backend Tests

**Lokasi:** Backend tests

**Perubahan:**
1. **Buat `DueTypeTest.php`** — CRUD test + validasi
2. **Buat RBAC/403 test** — Test user Warga akses endpoint Admin → 403
3. **Buat Warga scope test** — Test bills.view scope

### Task 6: Frontend Test Fix (Opsional)

**Lokasi:** Frontend vitest config

**Perubahan:**
1. Cek penyebab browser provider error
2. Fix konfigurasi agar unit test bisa jalan tanpa Playwright browser

### Task 7: GitHub Actions CI (Opsional)

**Lokasi:** Root project

**Perubahan:**
1. Buat `.github/workflows/ci.yml`
2. Jalankan `php artisan test` di backend
3. Jalankan `npx vitest run` di frontend
4. Jalankan `npx playwright test` di frontend (optional, butuh server)

---

## 4. Urutan Eksekusi

1. **Task 1** — RBAC enforcement (paling kritis, security)
2. **Task 2** — Frontend endpoint mismatch (blocking bug)
3. **Task 3** — Dashboard + seeders (user experience)
4. **Task 4** — House status auto-sync (data integrity)
5. **Task 5** — Missing tests (quality assurance)
6. **Task 6** — Vitest fix (opsional)
7. **Task 7** — CI/CD (opsional)


Sekarang saya akan lakukan self-review dan minta persetujuan Anda.

## 5. Testing Strategy

- Setelah Task 1: Run `php artisan test` — pastikan 73+ tests tetap passing
- Setelah Task 2: Run `npx tsc --noEmit` — pastikan type safe
- Setelah Task 3: Run `php artisan migrate:fresh --seed` — pastikan login dengan admin@siwarga.test
- Setelah Task 4: Run HouseTest — pastikan auto-sync bekerja
- Setelah Task 5: Run all tests — minimal 80+ tests passing

## 6. Risiko

| Risiko | Mitigasi |
|--------|----------|
| RBAC middleware bisa break endpoint yang belum di-test properly | Run full test suite setelah implementasi |
| Perubahan endpoint di services bisa break MSW mock | Update MSW handlers juga |
| auto-sync bisa infinite loop jika tidak hati-hati | Test dengan factory sebelum deploy |

---
