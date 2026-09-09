# Fase 3 — Booking Fasilitas, Inventaris Aset & Kegiatan Admin

**Tanggal:** 2026-09-09
**Status:** Design disetujui user (5/5 section), menunggu implementation plan via `writing-plans`.
**Scope:** Booking fasilitas (katalog + anti-bentrok + approval + auto-tagihan + notifikasi), inventaris aset (stok + pinjam/approve/kembali), kegiatan admin (CRUD event + galeri + status; publik read-only tak tersentuh). Tanpa WebSocket, tanpa pembayaran online (tagihan dibayar via modul keuangan existing).
**Pendekatan:** Vertical slice per domain (opsional A yang disetujui): (1) booking, (2) aset, (3) kegiatan admin.

## 1. Arsitektur & Permission

Backend pola existing (Controller → Policy → Service, `can:` middleware + `$this->authorize()` per-instance). Permission granular (bukan role hardcoded):

- `facilities.view` (semua role — katalog terlihat warga), `facilities.manage` (CRUD + mapping iuran; kini admin).
- `bookings.create` (warga ajukan + batalkan milik sendiri), `bookings.view` (warga: miliknya; admin: semua), `bookings.review` (approve/reject; kini admin).
- `assets.view` (semua — stok terlihat), `assets.manage` (CRUD aset; admin), `asset-loans.request` (warga pinjam), `asset-loans.review` (approve/reject/kembali; admin).
- `events.manage` (CRUD kegiatan + galeri + status; admin).
- Notifikasi reuse penuh infra Fase 2: `BookingDecided` via channel database + `SendBookingWhatsappJob` via `WahaService`.

Frontend: `siwarga-bookings` (katalog + ajukan + list + review admin), `siwarga-assets` (stok + pinjam + review + kembali), `siwarga-events` (tabel admin + form + galeri); sidebar grup baru `Fasilitas`.

## 2. Model Data & Migrasi

Semua tabel baru (tabel `events`/`event_documentation` existing tak diubah):

- `facilities`: id, name (max 100), description (nullable, sanitize), rental_fee (decimal nullable — null = gratis), due_type_id (nullable FK due_types — mapping iuran opsional), is_active (default true), timestamps + soft delete.
- `facility_bookings`: id, facility_id, booked_by (FK users), event_id (nullable FK events), start_at, end_at (datetime; end > start), status enum pending/approved/rejected/cancelled default pending, approved_by (nullable FK users), timestamps (tanpa soft delete — riwayat terbaca via status). Index `(facility_id, start_at, end_at)`.
- `assets`: id, name, quantity (int ≥ 0), condition enum baik/rusak_ringan/rusak_berat default baik, timestamps + soft delete.
- `asset_loans`: id, asset_id, borrowed_by (FK users), quantity (≥ 1), status enum pending/approved/rejected/returned default pending, borrowed_at (nullable — diisi saat approve), returned_at (nullable), timestamps.
- Relasi: Facility hasMany bookings + belongsTo dueType; Booking belongsTo facility/booker/event/approver; Asset hasMany loans; Loan belongsTo asset/borrower.

## 3. Data Flow & Validasi

- **Booking**: `POST /api/bookings` (facility aktif, start < end, start di masa depan; TANPA cek bentrok — pending boleh tumpang-tindih). `POST /api/bookings/{id}/approve` dalam transaksi + `lockForUpdate` baris fasilitas: cek overlap lawan `approved` (`start < req.end && end > req.start`) → 422 bila bentrok; set approved + approved_by; auto-reject pending yang overlap + notifikasi tiap pemohon; bila `rental_fee > 0` DAN `due_type_id` terisi → buat `Bill` (rumah aktif pemesan, resident pemesan, periode = tanggal booking, nominal = rental_fee, generated_by = approver); cek eksplisit Bill existing untuk (due_type, house, tanggal) — bila ada, skip + log warning (idempoten). Tanpa mapping/fee = approve polos. `POST .../reject` (alasan opsional → notifikasi). `POST .../cancel` (pemilik sebelum start; admin semua).
- **Aset**: `POST /api/asset-loans` (quantity ≥ 1); approve dalam transaksi + lock cek `quantity - sum(active approved)` ≥ diminta → 422 bila kurang; reject; `POST .../return` isi returned_at. Stok master hanya via CRUD admin; ketersediaan selalu dihitung, bukan dikurangi.
- **Kegiatan**: admin CRUD events (title, description sanitize, starts_at/ends_at, status manual default upcoming, is_public) + `POST /api/events/{id}/documentation` (foto maks 5 @ 2MB, pola tiket) + hapus dokumentasi.
- **Notifikasi**: tiap keputusan booking (approved/rejected/auto-reject) → database notif + WA job ke pemohon, try/catch ala Fase 2.

## 4. Error Handling

- 403 bukan-milik/tanpa permission (bukan 404); 422 bentrok slot / stok kurang / transisi ilegal (approve decided, cancel lewat start) / file melebihi batas.
- Anti double-booking: overlap-check + insert dalam transaksi + `lockForUpdate`; approve bersamaan → satu menang satu 422.
- Auto-tagihan idempoten: dalam transaksi approval + guard satu-arah (approve ulang → 422 sebelum billing) + cek Bill existing.
- Notifikasi/WA gagal → log, aksi tetap 200. Galeri per-file response seperti tiket.
- Frontend: toast Bahasa Indonesia; pesan bentrok jelas ("Slot sudah terisi, pilih waktu lain"); draft dipertahankan saat gagal.

## 5. Testing

- Backend (PHPUnit, TDD): `BookingTest` (pending overlap OK; approve + auto-reject; approve kedua 422; berbayar+mapping → 1 Bill nominal fee; tanpa mapping → tanpa Bill; approve ulang 422 tanpa Bill ganda; warga 403 approve; cancel sendiri OK), `AssetLoanTest` (pinjam → approve → sisa berkurang; lebih → 422; reject; return; warga 403 approve), `EventAdminTest` (CRUD + galeri batas + publik tak terpengaruh), policy unit tests.
- Frontend: e2e ajukan → approve → notif; bentrok → pesan jelas; pinjam → kembali; kegiatan + galeri. Suite hijau + spec baru.
- Verifikasi per slice: `composer test` setara CI + `npm run build` sebelum commit.

## Non-goals (siklus berikutnya)

- Pembayaran online/QRIS (Fase 5), kalender drag-and-drop (list + filter tanggal cukup), recurring booking, denda keterlambatan kembali aset, rating fasilitas, penghapusan permanen galeri massal, Buku Tamu/Panic/Ronda (Fase 4).
