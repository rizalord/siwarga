# Fase 1 Sisa — Pengumuman Warga, Polling & Voting, Forum Diskusi

**Tanggal:** 2026-09-08
**Status:** Design disetujui user (4/4 section), menunggu implementation plan via `writing-plans`.
**Scope:** Pengumuman sisi warga (list/detail/read-receipt) + Polling & Voting + Forum Diskusi dasar. Blog publik dikecualikan (dianggap selesai via `PublicAnnouncementController` Plan B). Komentar pengumuman dikecualikan.
**Pendekatan:** Vertical slice per domain (opsional A yang disetujui): tiap domain selesai full-stack berurutan.

## 1. Arsitektur & Permission

Backend mengikuti pola existing (Controller → Policy → Service, `can:` middleware untuk cek tanpa model + `$this->authorize()` untuk cek per-instance, sesuai `docs/superpowers/plans/2026-07-30-backend-service-pattern.md` dan Plan C).

### 1.1 Pengumuman warga
- `WargaAnnouncementController` baru (read-only `index`/`show`). `AnnouncementController` admin tidak diubah.
- `index` filter server-side: broadcast (tanpa `announcement_targets`) + yang target `house_id`-nya cocok dengan rumah aktif user (`users.resident_id` → `house_residents` where `end_date` null). Hanya `published_at != null`.
- `show` cek targeting yang sama, lalu auto-create `AnnouncementRead` idempotent (unique `announcement_id + user_id`).
- Permission: reuse `announcements.view` (warga sudah punya). Tanpa permission baru. Admin/Bendahara tetap memakai endpoint admin; bila mengakses endpoint warga, filter target di-bypass (lihat semua, tanpa auto-read).
- Routes: `GET /api/warga/announcements`, `GET /api/warga/announcements/{announcement}`.

### 1.2 Polling & Voting
- `PollController` (CRUD) + `POST /api/polls/{poll}/vote` + `GET /api/polls/{poll}/results`.
- Permission baru: `polls.view` (semua role), `polls.manage` (admin saja), `polls.vote` (warga + admin; bendahara view-only).
- `PollPolicy`: `vote` membutuhkan permission `polls.vote`ditambah `now` dalam `[starts_at, ends_at]` dan user belum vote; `results` true untuk pemegang `polls.manage` selalu, untuk pemegang `polls.view` non-admin (warga maupun bendahara) hanya jika sudah vote atau poll berakhir.
- Opsi poll immutable setelah dibuat (tanpa endpoint tambah/hapus opsi).

### 1.3 Forum Diskusi
- `ForumThreadController` (`index`/`show`/`store`/`destroy`) + `ForumPostController` nested (`index`/`store` per thread, `destroy` per post). Tanpa endpoint edit.
- Permission baru: `forum.view` (semua role, mencakup tulis sendiri), `forum.manage` (admin saja untuk hapus mana saja).
- Policy: delete thread/post boleh jika `forum.manage` atau pemilik (`created_by`/`user_id` == auth id).
- Delete thread soft-delete + cascade soft-delete posts di service layer.

### 1.4 Frontend
- `siwarga-announcements` ditambah mode warga (list kartu mobile-first + detail + badge belum-dibaca).
- `siwarga-polls` baru (tabel admin + form + UI vote + bar hasil).
- `siwarga-forum` baru (list thread + detail + balas).
- Tiap modul: service + TanStack Query hooks, reuse `DataTable*`, `use-table-url-state`, MSW handler sinkron.

## 2. Data Flow & Validasi

### 2.1 Pengumuman warga
- `GET /warga/announcements?search=&category=` → paginated + `is_read`/`read_at` per row (left join `announcement_reads` untuk user aktif).
- `GET /warga/announcements/{id}` → 403 jika tidak ditarget ke user; jika lolos, `updateOrCreate` read-receipt lalu return resource + `is_read: true`.
- Warga tanpa `resident_id` hanya melihat broadcast.

### 2.2 Polling
- `POST /polls`: `title` required max 200, `description` nullable, `starts_at < ends_at` required, `options` array min 2 label unik.
- Edit poll hanya `title`/`description`/periode, dan hanya sebelum `starts_at`.
- `POST vote`: `option_id` harus milik poll tersebut; tolak 422 jika di luar periode atau sudah vote (cek aplikasi + unique DB `poll_id + user_id` sebagai penegak akhir).
- `GET results` → `{total_votes, options: [{id, label, votes, percent}], user_voted_option_id}`; `votes`/`percent` null untuk pemegang `polls.view` non-admin yang belum vote dan poll-nya belum berakhir.

### 2.3 Forum
- `POST /threads`: `title` required max 200.
- `POST /threads/{id}/posts`: `content` required, sanitize via `HtmlSanitizer` (sama seperti pengumuman).
- Delete thread: soft-delete thread + posts-nya dalam satu transaksi service.

## 3. Error Handling

- 403 untuk bukan-target / belum-boleh-lihat-hasil / bukan-pemilik (bukan 404, agar tidak membocorkan keberadaan resource; soft-deleted tetap 404 normal).
- 422 untuk vote ganda, vote di luar periode, opsi tidak valid, edit opsi setelah poll dibuat.
- Race vote ganda: tangkap `QueryException` duplikat dari unique constraint, kembalikan 422 ramah (bukan 500).
- Read-receipt tidak pernah menggagalkan `show`: `updateOrCreate` dibungkus try/catch, failure di-log, detail tetap 200.
- Frontend: toast Bahasa Indonesia via TanStack Query `onError`; hasil tersembunyi tampilkan "Vote dulu untuk melihat hasil"; post forum gagal kirim pertahankan draft di form.

## 4. Testing

- Backend (PHPUnit, TDD ala Plan C):
  - `WargaAnnouncementTest`: warga lihat broadcast + target rumahnya, 403 non-target, auto-read tercipta idempotent, admin bypass.
  - `PollTest`: admin CRUD, warga 403 create, vote sukses, 422 vote ganda/luar periode/opsi asing, results tersembunyi sampai vote/berakhir.
  - `ForumTest`: warga buat thread/post, hapus milik sendiri OK, hapus milik orang 403, admin hapus mana saja.
  - Unit: `PollPolicyTest`, `ForumPolicyTest` (mirip `AnnouncementPolicyTest`).
- Frontend (Vitest + Playwright): MSW sinkron untuk endpoint baru; e2e `warga@siwarga.test` → buka pengumuman (badge berubah), vote sekali (hasil muncul), buat thread + balas (tampil).
- Verifikasi akhir per slice: `composer test` setara CI (pint + phpstan + phpunit) dan `npm run build` + `tsc -b` + eslint bersih.

## Non-goals (siklus berikutnya)

- Komentar pengumuman, blog publik tambahan, edit forum post, tambah/hapus opsi poll setelah dibuat, push notifikasi realtime (cukup polling ringan TanStack Query), Ticketing (Fase 2), Booking Fasilitas (Fase 3), Keamanan/Satpam (Fase 4).
