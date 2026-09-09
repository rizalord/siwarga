# Fase 2 — Ticketing, Notifikasi & Kotak Saran Anonim

**Tanggal:** 2026-09-09
**Status:** Design disetujui user (5/5 section), menunggu implementation plan via `writing-plans`.
**Scope:** Pengaduan/ticketing warga (lapor + foto + status + assign + komentar), notifikasi ganda (WA otomatis + in-app generik), kotak saran anonim. Tanpa realtime WebSocket (polling ringan), tanpa edit komentar (append-only).
**Pendekatan:** Vertical slice per domain (opsional A yang disetujui): (1) ticketing inti, (2) infra notifikasi generik, (3) saran anonim.

## 1. Arsitektur & Permission

Backend mengikuti pola existing (Controller → Policy → Service, `can:` middleware untuk cek tanpa model + `$this->authorize()` per-instance). Permission granular berbasis permission (bukan role hardcoded) agar role baru kelak bisa diberi sebagian:

- `tickets.view` — lihat tiket (warga: hanya miliknya; admin: semua).
- `tickets.create` — buat tiket + lampiran (warga + admin).
- `tickets.manage-status` — ubah status (kini: admin saja).
- `tickets.assign` — assign PIC (kini: admin saja; terpisah dari manage-status).
- `suggestions.create` — kirim saran anonim (semua user login; identitas tidak disimpan).
- `suggestions.view` — inbox saran + tandai reviewed (admin saja).
- Notifikasi in-app tanpa permission baru — user hanya akses notifikasinya sendiri (`auth` + filter `user_id`).

Frontend: `siwarga-tickets` (list warga + detail + komentar + form lapor + tabel admin dengan aksi status/assign), `siwarga-suggestions` (form anonim + inbox admin), bell notifikasi di header + halaman daftar notifikasi.

## 2. Model Data & Migrasi

Semua tabel baru (belum ada yang exist):

- `tickets`: id, reported_by (FK users), house_id (nullable FK houses — auto-diisi dari rumah aktif pelapor bila ada), title (max 200), description (text, sanitize server-side), category (varchar bebas, bukan enum), status enum open/in_progress/resolved default open, assigned_to (nullable FK users), timestamps + soft delete.
- `ticket_comments`: id, ticket_id, user_id, comment (text, sanitize), created_at (append-only, tanpa edit endpoint).
- `ticket_attachments`: id, ticket_id, file_path (storage pola foto KTP), created_at.
- `anonymous_suggestions`: id, content (text), status enum new/reviewed default new, created_at — SENGAJA tanpa user_id (anonim by design).
- `notifications`: tabel standar Laravel (`php artisan notifications:table` — uuid id, type, notifiable, data JSON, read_at) untuk channel database generik. Payload `TicketStatusUpdated`: `{ticket_id, title, old_status, new_status, actor_name}`.
- Relasi: Ticket belongsTo reporter/assignee/house, hasMany comments/attachments; trait Notifiable di User sudah ada.

## 3. Data Flow & Validasi

- **Lapor**: `POST /api/tickets` (title required max 200, description required, category nullable max 100, house_id opsional — kosong + pelapor punya rumah aktif → auto-isi). Foto via `POST /api/tickets/{id}/attachments` terpisah (maks 3 file @ 2MB jpg/png per tiket, hanya pemilik/admin) agar form lapor ringan dan retry upload independen.
- **Status**: `POST /api/tickets/{id}/status` (`status` in open/in_progress/resolved; forward-only open→in_progress→resolved, 422 untuk lompat/mundur; komentar sistem otomatis "Status diubah X→Y oleh {nama}"). Ganti status memicu dua notifikasi: (1) `TicketStatusUpdated` database ke pelapor, (2) dispatch `SendTicketWhatsappJob` (queued, ke nomor HP pelapor bila ada).
- **Assign**: `POST /api/tickets/{id}/assign` (`assigned_to` exists users) — permission `tickets.assign` terpisah.
- **Komentar**: `POST /api/tickets/{id}/comments` (warga: hanya tiket miliknya; admin: semua) — append-only.
- **Saran**: `POST /api/suggestions` (content required, identitas tidak disimpan); admin `GET /api/suggestions` + `POST /api/suggestions/{id}/mark-reviewed`.
- **Notifikasi in-app**: `GET /api/notifications` (milik sendiri, unread-first), `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`; bell header unread-count via polling TanStack Query interval 60s.

## 4. Error Handling

- 403 untuk bukan-milik / tanpa permission (bukan 404 agar tak bocorkan keberadaan tiket orang); 422 untuk transisi ilegal / file melebihi batas / tipe salah.
- Gagal upload satu foto tidak menggagalkan tiket (endpoint terpisah) — per-file error jelas, yang berhasil tetap tersimpan.
- Notifikasi tidak pernah menggagalkan aksi utama: database notify + WA dispatch dibungkus try/catch, status tetap 200 + failure di-log (pola read-receipt Fase 1).
- WA job catch-and-log per pesan, `tries = 3` seperti job pengumuman.
- Saran anonim diberi throttle ringan (seperti endpoint kontak publik); trade-off anonimitas diterima.
- Frontend: toast Bahasa Indonesia; komentar gagal kirim pertahankan draft; bell gagal fetch diam-diam.

## 5. Testing

- Backend (PHPUnit, TDD): `TicketTest` (buat + auto house_id, 403 intip milik orang, admin list semua, forward-only 422, assign butuh permission, komentar 403 non-milik, upload batas 3×2MB + 422 file ke-4/non-image), `TicketNotificationTest` (status → 1 database row + WA job dispatched; notifikasi gagal ≠ status gagal), `SuggestionTest` (201 tanpa identity tersimpan, inbox + mark-reviewed, warga 403 inbox), `TicketPolicyTest`/`SuggestionPolicyTest` unit (matriks permission incl. pisah manage-status vs assign).
- Frontend: e2e warga lapor + upload → muncul di list; admin ubah status → bell warga + database row; saran anonim → inbox admin. Suite hijau + spec baru.
- Verifikasi per slice: `composer test` setara CI + `npm run build` sebelum commit.

## Non-goals (siklus berikutnya)

- Realtime WebSocket, edit/hapus komentar, kategori tiket enum tetap, assign ke vendor eksternal (PIC hanya user internal), balas saran anonim (satu arah), Booking Fasilitas (Fase 3), Keamanan/Satpam (Fase 4).
