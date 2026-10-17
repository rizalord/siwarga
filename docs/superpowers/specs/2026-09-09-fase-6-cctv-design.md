# Fase 6 CCTV Event Push — Design Document

| | |
|---|---|
| **Proyek** | SIWarga v2 — Fase 6: CCTV event-push FTP→API (tanpa hardware baru) |
| **Tanggal** | 9 September 2026 |
| **Status** | Approved |
| **Dasar** | `docs/PRD-v2.md` §4.2 (parsial, software-only); diskusi hardware 2026-09-09 |

---

## 1. Latar Belakang & Scope

Server SIWarga di cloud; kamera (Tapo C310/RTSP sekelas, rekomendasi
hasil riset) numpang WiFi warga; **tanpa mini-PC di lokasi**. Karena RTSP
harus ditarik dari satu LAN, live stream terpusat tidak mungkin tanpa
perangkat bridge — maka fase ini mengerjakan **event push**: kamera
upload foto/klip via FTP saat motion → cloud ingest → snapshot log +
notifikasi. Live streaming disiapkan sebagai slot (`stream_url`) untuk
tahap B (bridge Tailscale / NVR HLS-out / sub-stream HTTP — cukup isi
URL, tanpa migrasi).

Perangkat acuan: 2× Tapo C310 (gerbang + pos, RTSP/ONVIF, ~Rp 450rb),
microSD per kamera (cadangan lokal), numpang guest-SSID WiFi tetangga
(2.4GHz, DHCP reservation). Titik solar-4G non-RTSP tetap via aplikasi
vendor (di luar sistem).

Non-goals: live view, rekaman 24/7 terpusat, NVR, MQTT/sensor IoT
(fase terpisah bila hardware ada), restore, playback NVR.

## 2. Data Model

Semua tabel soft delete + timestamps, konvensi existing.

### 2.1 `cameras`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `name` | string 100 | mis. "Gerbang Utama" |
| `location` | string nullable | detail titik |
| `ftp_user` | string unique | 1 user FTP per kamera (sumber file) |
| `camera_type` | string | `tapo`, `simulator` (slot lain belakangan) |
| `stream_url` | string nullable | HLS tahap B, kosong untuk sekarang |
| `is_active` | boolean default true | nonaktif = ingest skip |

### 2.2 `camera_snapshots`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `camera_id` | FK cameras | |
| `file_path` | string | storage Laravel (`camera-snapshots/`) |
| `mime` | string | `image/jpeg` / `video/mp4` (batas: jpg/png/mp4) |
| `size_bytes` | integer | tolak > 25MB |
| `event_type` | enum | `motion`, `panic`, `manual`, `simulated` |
| `captured_at` | datetime | waktu kejadian (EXIF/nama file, fallback waktu ingest) |
| `source_hash` | string unique | sha256 nama+ukuran file sumber (idempotency) |

### 2.3 `camera_access_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `snapshot_id` | FK | snapshot dilihat |
| `user_id` | FK users | penonton |
| `viewed_at` | datetime | default now |

Ditulis otomatis tiap `show` snapshot (audit privasi).

## 3. Ingest Flow

1. Kamera (konfigurasi sekali di app Tapo: motion → upload FTP ke
   `{FTP_HOST}/{ftp_user}/`) mendarat di volume `ftp-data`.
2. Scheduler tiap menit menjalankan `camera:ingest`:
   - untuk tiap kamera aktif, list file di `FTP_INBOX_PATH/{ftp_user}/`;
   - skip bila `source_hash` sudah ada (upload ulang = no-op);
   - validasi mime + ukuran → pindahkan ke disk public Laravel
     (`camera-snapshots/{camera_id}/`), buat row + access log
     (system), tandai sumber diproses (pindah ke subdir `.done/`,
     JANGAN hapus sebelum sukses — pola aman);
   - file invalid → pindah ke `.quarantine/` + log warning.
3. Tiap snapshot `motion`: DB notify ke Admin + Satpam (infra Fase 2,
   tanpa WA anti-spam). Korelasi panic: snapshot `motion` dari kamera
   mana pun dalam 5 menit setelah panic alert dibuat otomatis ditandai
   juga sebagai `panic` dan dilampirkan ke alert → DB + WA ke
   Satpam/Admin.
4. Hapus snapshot (Admin): hapus row + file storage (pelajaran Fase 3) +
   file `.done/` sumber bila masih ada.

Deploy (`docker-compose.yml` + `.env`):
- service `ftp` (`stilliard/pure-ftpd`), volume `ftp-data`,
  env `FTP_USER/FTP_PASS` (akun per kamera dibuat via
  `pure-pw`, highest dir = folder kamera masing-masing),
  `FTP_INBOX_PATH=/mnt/ftp-inbox` (mount `:ro` di container app),
  firewall: buka 21 + passive range, FTPS bila didukung.
- Rekomendasi pola: scheduler-scan tiap menit (logika 100% Laravel,
  gampang test/debug) — bukan hook upload-script.

## 4. RBAC

Permission baru: `cameras.view`, `cameras.manage`, `snapshots.view`.
Admin: semua. Satpam: `cameras.view` + `snapshots.view` (tanpa kelola).
Warga: tanpa akses snapshot (privasi) KECUALI snapshot `panic` yang
terkorelasi laporannya sendiri (via show panic detail — tampilkan
sebagai lampiran, tanpa route snapshot langsung). Semua `show`
snapshot menulis `camera_access_logs`.

## 5. API & Frontend

| Method | Endpoint | Permission |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/cameras` (+`/{camera}`) | `view` / `manage` |
| GET | `/api/camera-snapshots` (filter camera/date) | `snapshots.view` (+panic-owner exception) |
| GET/DELETE | `/api/camera-snapshots/{snapshot}` | `snapshots.view` (tulis access log) |
| POST | `/api/camera-snapshots/simulate` | dev-only + admin (simulator) |

Frontend (`siwarga-cctv`): daftar kamera (Admin CRUD incl. `ftp_user`
+ `stream_url` field — disabled dengan hint "tahap B" bila kosong?
Keputusan: field tampil normal, player dirender hanya bila terisi),
galeri snapshot + filter, tombol "Simulasi" (dev only), badge
`event_type`. Toast Bahasa Indonesia. Stream player (`hls.js`) TIDAK
di-scope (tahap B).

## 6. Simulator & Testing

- `SimulatorCamera`: `POST simulate` terima upload dummy (image) atau
  artisan `camera:simulate --camera=ID` yang menulis file contoh ke
  inbox → alur ingest normal. `camera_type='simulator'`, event
  `simulated` (terfilter dari galeri default? Keputusan: tampil dengan
  badge abu-abu — transparan untuk e2e).
- **PHPUnit**: ingest idempoten (file sama → 1 row), invalid
  (mime/size) → quarantine, warga 403 snapshot, hapus bersih file,
  panic-correlation notifikasi, simulator e2e-path.
- **E2E** `fase-6-cctv.spec.ts`: simulate → snapshot muncul di galeri +
  notifikasi bell; warga 403; public verify unaffected.
- Verifikasi penuh standar + triase pre-existing.
