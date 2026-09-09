# Fase 4 Keamanan — Design Document

| | |
|---|---|
| **Proyek** | SIWarga v2 — Fase 4: Keamanan (Buku Tamu, Panic Button, Ronda, Kartu Keluarga) |
| **Tanggal** | 9 September 2026 |
| **Status** | Approved |
| **Dasar** | `docs/PRD-v2.md` §4.3 + §4.10 (parsial) + §5; pola Fase 1–3 |

---

## 1. Latar Belakang & Scope

Fase 1 (komunikasi), Fase 2 (ticketing), Fase 3 (booking/aset/kegiatan) selesai di `develop`.
Fase 4 mengerjakan **keamanan operasional + identitas keluarga** dalam satu fase vertikal
(pendekatan A yang disetujui — pola Fase 3):

- **Buku tamu digital** — input manual Satpam + pra-daftar warga dengan token QR
- **Panic button** — alert darurat warga → Satpam & Admin via notifikasi DB + WA (reuse infra Fase 2)
- **Jadwal ronda** — CRUD Admin, read Warga/Satpam (tanpa absensi di fase ini)
- **Kartu keluarga digital** — data anggota per rumah + kartu ber-QR verifikasi
- **Role Satpam baru** — operasional keamanan tanpa akses keuangan/data sensitif
- **Kontak darurat** — daftar nomor (RW, polisi, damkar, RS) tampil di UI warga

Non-goals (parkir eksplisit): absensi/kehadiran ronda, scan QR via kamera (verifikasi =
cocokkan token, Satpam ketik/pilih dari daftar), eskalasi WA otomatis ke eksternal,
CCTV/IoT (Fase 6), payment gateway/PWA (Fase 5).

## 2. Data Model

Semua tabel baru memakai soft delete + timestamps, mengikuti konvensi existing.

### 2.1 `guest_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `guest_name` | string | nama tamu (sanitize HTML) |
| `purpose` | string nullable | keperluan kunjungan |
| `house_id` | FK houses | rumah tujuan |
| `plate_number` | string nullable | plat nomor kendaraan |
| `registered_by` | FK users nullable | warga pendaftar (null = walk-in Satpam) |
| `qr_token` | string unique nullable | token acak pra-daftar (bukan data pribadi) |
| `visit_date` | date | tanggal kunjungan rencana/aktual |
| `status` | enum | `registered` → `checked_in` → `checked_out` |
| `checked_in_at` / `checked_out_at` | datetime nullable | |
| `recorded_by` | FK users nullable | Satpam pencatat |

Walk-in Satpam langsung `checked_in`. Pra-daftar warga = `registered` + `qr_token`;
check-in/out oleh Satpam (atau Admin).

### 2.2 `panic_alerts`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `reporter_id` | FK users | pelapor |
| `house_id` | FK houses nullable | lokasi (rumah pelapor bila ada) |
| `location_note` | string nullable | detail lokasi (sanitize HTML) |
| `note` | text nullable | keterangan (sanitize HTML) |
| `status` | enum | `active` → `handled` → `resolved`; `cancelled` oleh pelapor |
| `handler_id` | FK users nullable | Satpam/Admin penangan |
| `handled_at` / `resolved_at` | datetime nullable | |

Aturan: **satu alert `active` per pelapor** — `POST` baru 422 selama masih ada yang
`active` (kecuali dibatalkan). Throttle endpoint tambahan.

### 2.3 `patrol_schedules`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `date` | date | tanggal jaga |
| `shift` | enum | `pagi` / `siang` / `malam` |
| `personnel_name` | string | nama petugas (bebas, bisa non-user) |
| `user_id` | FK users nullable | bila petugas adalah user Satpam |
| `area` | string nullable | area ronda |
| `note` | text nullable | |

Unik `(date, shift)` — satu shift satu regu. CRUD Admin, read Warga/Satpam.

### 2.4 `family_members`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `house_id` | FK houses | rumah |
| `name` | string | nama anggota |
| `relationship` | enum | `kepala_keluarga`, `pasangan`, `anak`, `orang_tua`, `famili_lain`, `pembantu`, `kontrak` |
| `nik` | string nullable | hanya terlihat Admin + keluarga sendiri |
| `birth_date` | date nullable | |
| `phone` | string nullable | |

Scoping: warga kelola hanya rumahnya (diturunkan dari user → resident aktif →
house); Admin kelola semua; Satpam **tanpa akses** modul ini.

### 2.5 `emergency_contacts`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `name` | string | mis. "Polsek Setempat", "Ketua RW 05" |
| `phone` | string | nomor telpon |
| `sort_order` | integer default 0 | urutan tampil |

CRUD Admin, read semua authenticated user. Render `tel:` link di halaman panic warga.

### 2.6 Kartu QR tanpa tabel baru

QR = signed URL ke `GET /api/public/households/{token}` dengan `token` =
HMAC(`house_id`, app key) — stateless, tanpa kolom baru. Endpoint publik hanya
kembalikan `{ kepala_keluarga, address }` — tanpa NIK/tanggal lahir/telepon.
QR dirender di frontend via library (tanpa image backend).

## 3. RBAC & Role Satpam

10 permission baru (format `{module}.{action}`):

| Modul | Permission |
|---|---|
| Buku tamu | `guest-logs.view`, `guest-logs.manage`, `guest-logs.register` |
| Panic | `panic-alerts.report`, `panic-alerts.handle` |
| Ronda | `patrol-schedules.view`, `patrol-schedules.manage` |
| Keluarga | `family-members.view`, `family-members.manage` |
| Kontak darurat | `emergency-contacts.manage` (read ikut authenticated) |

| Role | Akses Fase 4 |
|---|---|
| **Admin** | semua |
| **Satpam** *(baru)* | `guest-logs.view/manage`, `panic-alerts.handle`, `patrol-schedules.view`, tanpa keuangan/penghuni/keluarga |
| **Warga** | `panic-alerts.report`, `guest-logs.register`, `patrol-schedules.view`, `family-members.*` scoped rumah sendiri |
| **Bendahara** | tidak berubah (tanpa akses keamanan) |

Registrasi mengikuti pola Fase 1–3: Policy per model → `Gate::define` di
`AppServiceProvider` → seeder Permission/Role idempoten → rute `can:` middleware.
Seeder `RoleSeeder`: admin auto-sync `Permission::all()`, Satpam seeded dengan set
di atas + demo login `satpam@siwarga.test` / `password` via `UserSeeder`.

## 4. Backend

### 4.1 Controller → Policy → Service

| Controller | Service (bila non-CRUD) |
|---|---|
| `GuestLogController` | `GuestLogService` (token QR unik, transisi status) |
| `PanicAlertController` | `PanicAlertService` (aturan 1-aktif, dispatch notifikasi) |
| `PatrolScheduleController` | — (CRUD + validasi unik shift) |
| `FamilyMemberController` | — (CRUD + scoping rumah) |
| `EmergencyContactController` | — (CRUD + ordering) |
| `HouseholdCardController` | token HMAC + endpoint publik read-only |

### 4.2 Alur panic (load-bearing)

1. `POST /api/panic-alerts` (confirm di UI anti-kepencet) → validasi 1-aktif → buat
   `active` dalam transaksi + tulis notifikasi DB untuk semua Admin & Satpam.
2. **Setelah commit** dispatch WA job per penerima (pelajaran Fase 3: tidak ada
   dispatch di dalam transaksi; kumpulkan keputusan di tx, kirim setelah return).
3. `POST /api/panic-alerts/{id}/handle` (Satpam/Admin) → `handled` + catat handler →
   notifikasi DB + WA ke pelapor. `POST .../resolve` → `resolved` + notifikasi.
   `POST .../cancel` oleh pelapor → `cancelled`.
4. Reuse `Notification` infra + job WA Fase 2 (`tries = 3`); tidak pernah assert
   pengiriman WA di test — assert state DB/API.

### 4.3 Validasi & keamanan

- HTML sanitization untuk `guest_name`, `purpose`, `location_note`, `note`,
  `personnel_name`, `area` (pola `HtmlSanitizer` existing di controller/service).
- `qr_token`: `Str::random(32)`, unique index; tebak-token tidak membocorkan data
  (lookup butuh auth + permission).
- NIK: fillable, hanya diekspos di Resource bila `can:family-members.manage` atau
  pemilik rumah; tidak pernah di endpoint publik.
- Mass assignment: `$fillable` eksplisit; `status` hanya via endpoint transisi
  (tidak via `PUT` umum).
- Rate limit: throttle `POST panic-alerts` + aturan 1-aktif (422).

## 5. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET/POST | `/api/guest-logs` | `guest-logs.view` / `manage,register` |
| POST | `/api/guest-logs/{id}/check-in` | `guest-logs.manage` |
| POST | `/api/guest-logs/{id}/check-out` | `guest-logs.manage` |
| GET/POST | `/api/panic-alerts` | `panic-alerts.handle` / `report` |
| POST | `/api/panic-alerts/{id}/handle` | `panic-alerts.handle` |
| POST | `/api/panic-alerts/{id}/resolve` | `panic-alerts.handle` |
| POST | `/api/panic-alerts/{id}/cancel` | pelapor / handle |
| GET/POST/PUT/DELETE | `/api/patrol-schedules` | `view` / `manage` |
| GET/POST/PUT/DELETE | `/api/family-members` | scoped `view` / `manage` |
| GET/POST/PUT/DELETE | `/api/emergency-contacts` | auth read / `manage` |
| GET | `/api/households/card` | pemilik rumah (data + QR payload) |
| GET | `/api/public/households/{token}` | publik (nama KK + alamat saja) |

Response wrapper `ApiResponse` existing; list paginated + filter
(status/tanggal/search) mengikuti pola Fase 2/3.

## 6. Frontend

Fitur baru (pola `*-columns.tsx`, `*-table.tsx`, `*-provider.tsx`, `index.tsx`):

- `siwarga-guest-logs` — tabel tamu + filter status/tanggal, dialog input manual,
  dialog pra-daftar (warga) dengan QR render, aksi check-in/out (Satpam)
- `siwarga-panic` — tombol darurat prominent (mobile-first, dialog konfirmasi),
  daftar alert + aksi tangani/selesaikan/batalkan, daftar kontak darurat tap-to-call
- `siwarga-patrols` — CRUD jadwal (Admin), kalender/list read-only (Warga/Satpam)
- `siwarga-family` — CRUD anggota (scoped), kartu digital + QR
- Dashboard: widget alert aktif + tamu hari ini untuk Satpam/Admin; tombol panic
  untuk Warga
- Sidebar menu dinamis per permission; mock MSW sinkron bila endpoint disentuh

## 7. Testing

- **PHPUnit** per domain: panic 422 saat alert aktif, handle/resolve transisi +
  notifikasi DB tertulis, QR token unik, scoping keluarga (warga rumah lain 403),
  Satpam 403 modul keuangan/penghuni/keluarga, unik `(date, shift)` ronda,
  endpoint publik tanpa NIK
- **E2E Playwright** `fase-4-security.spec.ts`: lapor panic → tangani → selesai;
  pra-daftar tamu → check-in → check-out; NIK tidak bocor di endpoint publik
- Verifikasi penuh: `composer test`, `npm run build`, `npm run test`, full Playwright
  (triage pre-existing vs baru seperti siklus sebelumnya)

## 8. Migrasi & Deploy

- 5 migrasi tabel baru (FK ke `houses`/`users` yang sudah ada; `down()` lengkap)
- Re-run `PermissionSeeder` + `RoleSeeder` + `UserSeeder` untuk role Satpam &
  10 permission baru di environment existing
- Tanpa perubahan skema Fase 1–3 (non-breaking)
