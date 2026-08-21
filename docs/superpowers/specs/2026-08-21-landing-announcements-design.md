# Design: Landing Page Publik + Pengumuman & Komunikasi (SIWarga v2, Fase 0+1)

**Status:** Draft — disetujui untuk lanjut ke implementation plan
**Dasar:** `docs/PRD-v2.md` §4.1, §4.12, §5, §6, §7 (Fase 0 & Fase 1) dan `docs/ERD-v2.dbml`

## 1. Latar Belakang & Scope

SIWarga v2 (`docs/PRD-v2.md`) memperluas SIWarga dari sistem administrasi RT menjadi smart residential information system, mencakup ~11 modul (~47 fitur). Ini terlalu besar untuk satu spec/implementation plan, sehingga didekomposisi menjadi sub-proyek per fase. Sub-proyek ini adalah **Fase 0 + Fase 1 digabung**:

- **Landing Page Publik (Astro)** — Hero/Banner, Profil Komplek, Kontak, Blog Publik, Daftar Kegiatan, Galeri Dokumentasi Kegiatan (PRD §4.12)
- **Pengumuman & Komunikasi** — CRUD, targeting per rumah, notifikasi WA via WAHA, read receipt (PRD §4.1)
- **Polling & Voting** (bagian dari Fase 1 PRD §7)
- **Forum Diskusi Warga** (bagian dari Fase 1 PRD §7)

### Di luar scope (sub-proyek terpisah nanti)

CCTV (§4.2), buku tamu/panic button/jadwal ronda (§4.3), ticketing (§4.4), booking fasilitas (§4.5), perluasan keuangan lain seperti reminder tagihan (§4.6 sebagian), IoT (§4.7), marketplace (§4.8), payment gateway/peta/cuaca (§4.9), profil digital keluarga/kartu ID (§4.10 sebagian), inventaris aset/backup/PWA (§4.11). Tabel `media_assets` dari ERD-v2 juga di-drop dari scope — `pages.hero_image` dan `event_documentation.file_path` sudah cukup untuk kebutuhan saat ini; media library terpusat baru dibangun kalau ada use case konkret.

### Prinsip non-breaking

Semua perubahan berupa tabel & endpoint baru. Tidak ada migrasi yang mengubah skema v1 (`residents`, `houses`, `bills`, `payments`, `expenses`, dst.).

## 2. Data Model

Migration baru (Laravel, `src/backend/database/migrations/`), mengacu `docs/ERD-v2.dbml` minus `media_assets`, plus satu tabel baru yang belum ada di ERD-v2:

| Tabel | Catatan |
|---|---|
| `pages` | Konten semi-statis: slug (`home`, `profil-komplek`, `kontak`), `title`, `content` (HTML dari rich-text), `hero_image` (path storage), `updated_by` |
| `events`, `event_documentation` | Kegiatan RT + galeri; `events.is_public` mengontrol tampil di landing page |
| `announcements`, `announcement_targets`, `announcement_reads` | Pengumuman; `content` HTML; `is_public` mengontrol tampil sebagai blog |
| `polls`, `poll_options`, `poll_votes` | Unique index `(poll_id, user_id)` mencegah vote ganda |
| `forum_threads`, `forum_posts` | Diskusi terbuka per topik |
| `contact_messages` **(baru, di luar ERD-v2)** | `id, name, email, phone, message, status(enum: new, read), created_at` — submission form Kontak landing page |

Semua tabel entitas utama (`pages`, `events`, `announcements`, `forum_threads`) pakai soft delete (`deleted_at`) mengikuti konvensi v1.

## 3. Backend (Laravel)

Pola existing: **Controller → Policy → Service**, satu model+migration+resource+policy+service+feature test per resource, `Gate::define()` per permission di `AppServiceProvider::registerGates()`.

### 3.1 Dua kelompok route

1. **Authenticated** (`auth:sanctum`, grup existing di `routes/api.php`) — CRUD penuh:
   - `pages` (update saja per slug, tanpa create/delete — daftar slug tetap)
   - `events`, `event-documentation` (nested di bawah event)
   - `announcements` (termasuk assign target dan trigger publish)
   - `polls`, `poll-votes` (submit vote)
   - `forum-threads`, `forum-posts`
   - `contact-messages` (index, mark-read — read only dari sisi admin)

2. **Public** (prefix `public`, **tanpa** `auth:sanctum`) — read-only untuk Astro, plus satu write:
   - `GET /public/pages/{slug}`
   - `GET /public/announcements` — filter `is_public=true` dan `published_at <= now()`
   - `GET /public/events`, `GET /public/events/{slug}` — filter `is_public=true`
   - `POST /public/contact` — satu-satunya write publik; wajib pakai Laravel rate limiter (`throttle`) untuk cegah spam

### 3.2 Permission baru (PRD §5)

| Permission | Admin | Bendahara | Warga |
|---|---|---|---|
| `pages.manage` | ✓ | – | – |
| `events.manage` | ✓ | – | – |
| `announcements.manage` | ✓ | kategori `keuangan` saja | – |
| `announcements.view` | ✓ | ✓ | ✓ |
| `polls.manage` | ✓ | – | – |
| `polls.vote` | ✓ | ✓ | ✓ |
| `forum.post` | ✓ | ✓ | ✓ |
| `forum.moderate` | ✓ | – | – |
| `contact-messages.view` | ✓ | – | – |

Batasan Bendahara pada kategori `keuangan` diimplementasikan di `AnnouncementPolicy` (bukan gate generik), memeriksa `announcement.category` terhadap role user.

### 3.3 Broadcast WhatsApp (WAHA)

- `WahaService` (HTTP client ke instance WAHA) di `app/Services/`.
- Publish pengumuman dengan target → dispatch queued job `SendAnnouncementWhatsappJob` yang loop residents bertarget, panggil `WahaService::sendMessage()` per nomor dengan jeda antar pesan (throttle, sesuai risiko rate-limit WAHA di PRD §6).
- Kegagalan kirim per nomor **tidak** menggagalkan seluruh broadcast job (catch per-iterasi, log kegagalan) — tidak perlu tabel status pengiriman terpisah di scope ini, cukup log.
- Job dijalankan lewat queue database (`QUEUE_CONNECTION=database`, sudah dikonfigurasi tapi **belum ada worker yang jalan** — lihat §5).

### 3.4 Rich text

`announcements.content` dan `pages.content` disimpan sebagai HTML mentah dari editor Tiptap di frontend. Backend **wajib** sanitize HTML (strip `<script>`, event handler attributes, dll — pakai library sanitizer PHP, mis. `HTMLPurifier` atau setara) sebelum simpan, karena `is_public` konten ini dirender langsung di Astro tanpa auth.

## 4. Frontend Admin (React SPA existing)

Feature module baru di `src/frontend/src/features/`, mengikuti pola `siwarga-*` (`*-columns.tsx`, `*-table.tsx`, `*-provider.tsx`, `index.tsx`):

- `siwarga-pages` — form edit per slug (bukan tabel), upload hero image
- `siwarga-events` — table + form, upload galeri dokumentasi
- `siwarga-announcements` — table + form dengan editor **Tiptap**, pilih kategori/target rumah, tombol publish (trigger WA job)
- `siwarga-polls` — table + form buat polling, halaman hasil vote
- `siwarga-forum` — list thread + moderasi
- `siwarga-contact-messages` — inbox sederhana, tandai dibaca

Layer data mengikuti pola existing: `src/services/*.ts` (axios) + `src/hooks/use-*.ts` (TanStack Query). RBAC UI: sembunyikan aksi berdasarkan `user.permissions`, konsisten dengan modul lain.

**Dependency baru:** Tiptap (rich text editor), ditambahkan ke `package.json`.

## 5. Astro Landing Page

Aplikasi baru di `src/landing/`, sejajar `src/backend` dan `src/frontend`. **Hybrid rendering** dengan `@astrojs/node` (standalone mode):

| Halaman | Mode | Sumber data |
|---|---|---|
| `/` (Hero) | Static (prerender) | `GET /public/pages/home` |
| `/profil-komplek`, `/kontak` | Static | `GET /public/pages/{slug}` |
| `/blog`, `/blog/[slug]` | SSR on-demand | `GET /public/announcements` |
| `/kegiatan`, `/kegiatan/[slug]` | SSR on-demand | `GET /public/events` (termasuk galeri `event_documentation`) |

- Form Kontak: fetch client-side langsung ke `POST /public/contact`.
- Gambar (hero, galeri) diakses via URL storage Laravel (`APP_URL/storage/...`), pola sama seperti `storage:link` untuk foto KTP di v1.
- Tidak ada autentikasi di Astro — murni konsumen `GET /public/*` + satu `POST /public/contact`.
- Env var `PUBLIC_API_URL` (analog `VITE_API_URL`).

## 6. Infra (docker-compose) & Queue Worker

**Service baru** di `docker-compose.yml` (dev) dan `docker-compose.prd.yml` (prod), mengikuti pola existing (`build.context`, image per-env, volume bind-mount di dev):

- `landing` — build dari `src/landing`; dev: `astro dev` bind-mount; prod: `node ./dist/server/entry.mjs` (Node adapter standalone); env `PUBLIC_API_URL`
- `waha` — image `devlikeapro/waha`, volume untuk sesi WA (setup QR scan manual sekali, dicatat sebagai langkah operasional di README, bukan otomatis)

**Queue worker (belum ada sama sekali di stack saat ini):**
- Dev: service baru `queue` di `docker-compose.yml`, image `siwarga-backend:dev` yang sama, command `php artisan queue:work`
- Prod: tambah `[program:queue-worker]` (`php artisan queue:work`) ke `docker/supervisord.conf` existing, disupervisi bareng `php-fpm` dan `nginx`

## 7. Testing

- **Backend:** `tests/Feature/Api/*Test.php` per resource baru (Pages, Events, Announcements, Polls, Forum, ContactMessage) + `tests/Feature/Api/PublicApiTest.php` (pastikan endpoint publik tanpa auth, hanya `is_public=true` yang muncul) + `tests/Unit/WahaServiceTest.php` (mock HTTP client, tidak memanggil WAHA sungguhan di test)
- **Frontend admin:** unit test per feature module (`npm run test`, browser mode) mengikuti pola existing
- **Astro:** tidak ada suite existing di repo ini — minimal smoke test (build sukses) dan verifikasi manual saat implementasi; Playwright e2e opsional untuk jalur kritikal (form kontak)
- **e2e:** tambah spec baru di `e2e/siwarga/` (mis. `announcements.spec.ts`, `polls.spec.ts`) mengikuti pola existing untuk alur admin

## 8. Hal yang Perlu Diputuskan Saat Implementasi

- Library sanitizer HTML PHP yang dipakai (mis. `mews/purifier` atau setara) — dipilih di plan/implementasi, bukan bagian keputusan desain ini.
- Detail throttle (jeda antar pesan WA, ukuran batch) — nilai konkret ditentukan saat implementasi `SendAnnouncementWhatsappJob`, prinsip "jangan broadcast semua sekaligus" sudah ditetapkan di §3.3.
