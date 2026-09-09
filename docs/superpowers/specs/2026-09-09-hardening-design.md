# Hardening Backlog — Design Document

| | |
|---|---|
| **Proyek** | SIWarga v2 — Hardening: backlog Fase 4 + Fase 5 |
| **Tanggal** | 9 September 2026 |
| **Status** | Approved |
| **Dasar** | Final review Fase 4 (`review-1725f8d..6dfbb0b`) + final review Fase 5 (`review-ce1af2b..62c93f8`) |

---

## 1. Latar Belakang & Scope

Bundle penutup utang teridentifikasi dari dua final review, dikelompokkan
per area dalam satu fase (pendekatan A yang disetujui). Tidak ada skema
baru kecuali 1 index; tidak ada permission baru; tidak ada dep baru.

Tetap parkir (butuh keputusan produk/infra lebih besar, bukan fase ini):
soft-delete vs unique patrol, teks error houseless 422, bespoke history
table, sidebar breadth, retry-button naming, restore backup, provider
selain Xendit/Simulator.

## 2. Verify Page KK + Kontak Admin UI

### 2.1 Halaman verifikasi publik

- Rute publik React di luar `_authenticated`:
  `/verifikasi-keluarga/{token}` — fetch
  `GET /api/public/households/{token}`, render kartu (nama KK, nomor
  rumah, alamat, badge VALID) atau state tidak-valid (token salah/
  kedaluwarsa logika) dengan pesan Bahasa Indonesia. Tanpa login.
- QR di kartu keluarga (`siwarga-family`) yang selama ini placeholder
  menjadi terverifikasi ujung-ke-ujung saat di-scan.
- Tidak ada perubahan backend (endpoint sudah ada + e2e-tested).

### 2.2 Kelola kontak darurat (Admin)

- Halaman `/emergency-contacts` (Admin, `emergency-contacts.manage`):
  tabel + dialog tambah/ubah/hapus + urutan (`sort_order`), pola
  `siwarga-*` existing. Service + hook baru (`emergency-contacts.ts`,
  `use-emergency-contacts.ts` — read untuk semua, write untuk admin).
- Halaman panic warga memakai ulang hook read (ganti fetch ad-hoc bila
  ada; bila sudah via hook, tanpa perubahan).

## 3. Dashboard Widget + Label Bahasa

- Widget dashboard (reuse endpoint existing + filter `status`/`date`):
  - Satpam/Admin: kartu "Panic Aktif" (count + link ke `/panic`) dan
    "Tamu Hari Ini" (count check-in belum checkout + link).
  - Warga: shortcut tombol panic (link `/panic`) + "Ronda Berikutnya"
    (1 jadwal terdekat).
- Peta label Bahasa di frontend untuk status notifikasi:
  `active→Aktif, handled→Ditangani, resolved→Selesai,
  cancelled→Dibatalkan, none→—`, judul `Panic Alert→Laporan Darurat`;
  terapkan di halaman/bell notifikasi (fallback mentah bila tak dikenal).
  Berlaku untuk status transaksi payment yang masih mentah
  (`pending→Menunggu` dst. — lengkapi peta yang sama).

## 4. Payment Safety

### 4.1 Double-spend lock

- `finalizePaid()`: `Bill::lockForUpdate()` + tolak 422 bila bill sudah
  `lunas` sebelum `PaymentService::create`; pindahkan tulis
  `verified_by/at` ke DALAM transaksi yang sama (tutup audit-clobber).
- Test: dua transaksi pending satu tagihan → settle bersamaan
  (simulator) → tepat 1 `Payment`, 1 `paid` + 1 gagal 422, bill `lunas`.

### 4.2 Xendit auth check

- Verifikasi ke docs Xendit (web): QR Codes + VA memakai HTTP Basic
  (`secret_key:`) atau Bearer. Bila Basic: ganti `withToken` →
  `withBasicAuth(secret, '')` + test `Http::fake` assert header
  `Authorization: Basic ...` + payload `external_id`/`amount`.
  Bila tak conclusive: parkir eksplisit, launch tetap simulator-only.

### 4.3 Channel mapping eksplisit

- `XenditProvider::createInvoice`: `qris` → QR branch;
  `va` → VA branch dengan `bank_code` wajib dari request (validasi
  controller: `required_if:channel,va`, tanpa default diam-diam);
  kanal lain (`ewallet`, dst.) → `ValidationException` 422
  `Kanal belum didukung provider ini`. Tidak ada lagi
  silent-fallthrough ke VA.

## 5. Validasi & Infra Kecil

- NIK 16-digit: `regex:/^[0-9]{16}$/` (nullable tetap boleh kosong) di
  `FamilyMemberController` store/update + pola yang sama di form
  frontend (pesan: "NIK harus 16 digit angka").
- Clamp export: `month` 1–12 (sudah), `year >= 2020`, `per_page` maks 100
  di `ExportController`; frontend nonaktifkan tombol bila input invalid.
- Hapus `abort_unless` ganda mati di `proof()` (sisakan owner-only +
  komentar satu baris).
- Migrasi index: `guest_logs(registered_by, status)` (nama
  `guest_logs_registrar_status`), dengan `down()` drop index.
- SW guards: `method !== GET` → network-only; hanya `res.ok` +
  same-origin yang di-`put`; runtime fetch gagal → fallback offline
  untuk navigasi (sudah ada, pertahankan).
- `ActivityLog` export ditulis SETELAH generate sukses (pindahkan 3
  titik logging ke bawah return generate — implementasi: generate dulu
  ke variabel, log, lalu return response).
- TS: longgarkan tipe notifikasi
  (`ticket_id?`, `transaction_id?`, `amount?`).
- `downloadBlob`: append anchor + revoke tertunda 1000ms (aman Safari).

## 6. Testing

- **PHPUnit**: double-settle race (1 menang/1 gagal), Xendit Basic
  header (bila jadi), channel tak dikenal 422, NIK 15-digit 422,
  bendahara verify tetap hijau (regresi Task 6), backup/export regresi.
- **E2E** `fase-6-hardening.spec.ts`: scan-QR → verify page VALID
  (ambil token via API card) + token salah → tidak-valid; kontak admin
  CRUD; widget dashboard tampil per role; NIK invalid ditolak di UI.
- Verifikasi penuh standar (composer test, build, vitest, full
  Playwright, triase pre-existing).
