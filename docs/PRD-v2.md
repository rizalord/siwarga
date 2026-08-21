# PRD SIWarga v2 — Smart Residential Information System

**Status:** Draft
**Versi:** 2.0 (Lanjutan dari SIWarga v1)
**Dasar:** [rizalord/siwarga](https://github.com/rizalord/siwarga)
**Disusun oleh:** Ahmad Rizal Khamdani

---

## 1. Latar Belakang

SIWarga v1 sudah menyediakan fondasi administrasi RT yang solid: manajemen penghuni, rumah, iuran & tagihan, pembayaran, pengeluaran, dashboard/laporan keuangan, RBAC granular (Admin/Bendahara/Warga), autentikasi, dan activity log — dibangun dengan Laravel 13 API + React 19 SPA (arsitektur API-first/decoupled).

v2 ini memperluas SIWarga dari sekadar **sistem administrasi RT** menjadi **smart residential information system**: mencakup komunikasi warga, keamanan berbasis CCTV, pengaduan fasilitas, dan booking fasilitas bersama — tanpa mengubah fondasi finansial yang sudah ada, hanya menambah modul baru di atasnya.

## 2. Tujuan

- Menjadikan SIWarga satu pintu (single source of truth) untuk seluruh aktivitas administratif dan operasional RT/perumahan.
- Meningkatkan transparansi keuangan dan komunikasi ke warga.
- Menyediakan visibilitas keamanan real-time (CCTV) yang terintegrasi dengan log kejadian.
- Mempermudah warga melaporkan masalah dan memesan fasilitas tanpa proses manual (WA grup, buku catatan fisik, dll).

## 3. Prinsip Desain

- **Non-breaking terhadap v1** — modul baru ditambahkan sebagai domain baru (folder `features/` baru di frontend, `Controllers/Api` baru di backend), tidak mengubah skema data iuran/tagihan/pembayaran yang sudah berjalan.
- **RBAC diperluas, bukan diulang** — role Admin, Bendahara, Warga yang sudah ada ditambah permission baru per modul, plus 1 role baru: **Satpam** (akses CCTV live & log tamu, tanpa akses keuangan).
- **Mobile-first untuk warga** — sebagian besar interaksi warga (lapor pengaduan, lihat pengumuman, booking fasilitas, panic button) harus nyaman diakses dari HP.

## 4. Modul Baru

### 4.1 Pengumuman & Komunikasi

| Fitur | Deskripsi |
|---|---|
| CRUD Pengumuman | Admin/Bendahara membuat pengumuman dengan kategori (Darurat, Umum, Kegiatan, Keuangan) |
| Target Audience | Broadcast ke semua warga, atau tertarget per rumah/blok |
| Notifikasi WA | Integrasi dengan WAHA (WhatsApp Gateway) untuk broadcast otomatis saat pengumuman baru dipublish |
| Read Receipt | Tracking siapa saja yang sudah membaca (penting untuk pengumuman darurat) |
| Komentar/Tanya | Opsional: warga bisa memberi komentar singkat di pengumuman non-darurat |

**Model data baru:** `announcements`, `announcement_reads`, `announcement_targets`

### 4.2 Keamanan — Integrasi CCTV

| Fitur | Deskripsi |
|---|---|
| Live View | Embed live stream dari kamera CCTV titik-titik strategis (gerbang, pos satpam, area umum) |
| Snapshot Log | Snapshot otomatis tersimpan saat event tertentu (motion detection dari NVR, atau manual trigger) |
| Akses Berjenjang | Live view hanya untuk role Admin & Satpam; warga hanya bisa lihat snapshot historis dengan approval, atau tidak sama sekali (privasi) |
| Playback (opsional v2.1) | Jika NVR support, embed playback rekaman berdasarkan rentang waktu |

**Catatan teknis:** Browser tidak bisa langsung membaca stream RTSP dari CCTV/NVR. Perlu media bridge seperti **MediaMTX** atau **go2rtc** yang mengonversi RTSP → HLS/WebRTC untuk ditonton di web. Ini komponen infrastruktur terpisah dari Laravel, backend hanya menyimpan referensi stream URL & metadata kamera.

**Model data baru:** `cameras`, `camera_snapshots`, `camera_access_logs`

### 4.3 Keamanan — Akses & Buku Tamu

| Fitur | Deskripsi |
|---|---|
| Buku Tamu Digital | Satpam/warga input data tamu masuk (nama, tujuan, plat nomor), bisa QR check-in bila tamu didaftarkan warga sebelumnya |
| Panic Button | Warga trigger tombol darurat dari aplikasi → notifikasi real-time ke Satpam & Admin (push notif / WA) |
| Jadwal Ronda | Admin atur jadwal jaga/ronda satpam, terlihat oleh warga untuk transparansi |

**Model data baru:** `guest_logs`, `panic_alerts`, `patrol_schedules`

### 4.4 Pengaduan / Ticketing

| Fitur | Deskripsi |
|---|---|
| Lapor Masalah | Warga membuat tiket pengaduan (kerusakan fasilitas, keluhan lingkungan, dll) dengan foto |
| Status Tracking | Open → In Progress → Resolved, dengan riwayat perubahan status |
| Assign PIC | Admin menugaskan tiket ke penanggung jawab (bisa internal RT atau vendor eksternal) |
| Notifikasi Update | Warga dapat notifikasi tiap status tiketnya berubah |

**Model data baru:** `tickets`, `ticket_comments`, `ticket_attachments`

### 4.5 Booking Fasilitas

| Fitur | Deskripsi |
|---|---|
| Katalog Fasilitas | Daftar fasilitas yang bisa dipinjam (aula, lapangan, dll) beserta aturan pakai |
| Kalender Booking | Warga ajukan booking di tanggal/jam tertentu, sistem cek bentrok otomatis |
| Approval Flow | Admin approve/reject booking, opsional biaya sewa yang terhubung ke modul keuangan existing |

**Model data baru:** `facilities`, `facility_bookings`

### 4.6 Perluasan Modul Keuangan (di atas v1)

| Fitur | Deskripsi |
|---|---|
| Laporan Publik ke Warga | View read-only laporan kas bulanan/tahunan untuk role Warga (transparansi, tanpa akses edit) |
| Export Laporan | Export laporan bulanan/tahunan ke PDF untuk ditempel di papan pengumuman fisik atau dibagikan |
| Notifikasi Tagihan Jatuh Tempo | Reminder otomatis via WA H-3 sebelum jatuh tempo, terintegrasi dengan modul Pengumuman & Komunikasi |

### 4.7 IoT & Smart Home

| Fitur | Deskripsi |
|---|---|
| Smart Gate/Palang Otomatis | Integrasi dengan ANPR (kamera pelat nomor) atau RFID/kartu akses untuk buka-tutup palang otomatis khusus penghuni terdaftar |
| Sensor Lingkungan | Monitoring sensor banjir/ketinggian air, kualitas udara, atau kebakaran di titik rawan, dengan alert otomatis ke Admin/Satpam |
| Smart Lighting Area Umum | Kontrol/monitoring lampu jalan komplek dari dashboard (nyala/mati terjadwal, deteksi lampu mati) |

**Model data baru:** `access_devices`, `sensor_readings`, `sensor_alerts`

**Catatan teknis:** modul ini paling bergantung pada hardware fisik (kontroler gate, sensor IoT) — biasanya berkomunikasi via MQTT ke backend, bukan HTTP langsung. Perlu broker MQTT (mis. Mosquitto/EMQX) sebagai komponen infrastruktur tambahan.

### 4.8 Marketplace & UMKM Warga

| Fitur | Deskripsi |
|---|---|
| Katalog UMKM Warga | Warga bisa mendaftarkan usaha kecil mereka (katering, jasa, dll) agar terlihat sesama warga |
| Listing Jual-Beli/Barter | Warga posting barang bekas/jual-beli antar tetangga |
| Rating & Ulasan | Sistem review sederhana antar warga untuk transaksi/UMKM |

**Model data baru:** `marketplace_listings`, `marketplace_reviews`

### 4.9 Integrasi Eksternal

| Fitur | Deskripsi |
|---|---|
| Payment Gateway | Pembayaran iuran online (QRIS/VA) langsung dari aplikasi, otomatis update status tagihan di modul Keuangan existing |
| Peta Interaktif Komplek | Peta digital lokasi rumah, fasilitas, dan titik CCTV untuk orientasi warga baru/tamu |
| Integrasi Cuaca | Info cuaca lokal di dashboard, berguna untuk area rawan banjir |
| Kalender Ibadah/Acara Keagamaan | Info jadwal sholat, kegiatan pengajian/ibadah komunitas (opsional, tergantung demografi warga) |

**Model data baru:** `payment_transactions`, `poi_locations` (points of interest)

### 4.10 Modul Warga Lanjutan

| Fitur | Deskripsi |
|---|---|
| Profil Digital Keluarga | Data anggota keluarga lengkap per rumah (bukan cuma kepala keluarga), berguna untuk data demografi RT |
| Kartu Keluarga Digital | Generate kartu identitas digital warga (QR code) untuk verifikasi cepat di gerbang/acara |
| Polling & Voting | Admin buat polling keputusan RT (misal iuran khusus, pemilihan ketua RT), warga vote via aplikasi |
| Forum Diskusi Warga | Ruang diskusi terbuka per topik, terpisah dari pengumuman resmi |
| Kotak Saran Anonim | Warga kirim masukan/kritik tanpa nama untuk sensitivitas tertentu |

**Model data baru:** `family_members`, `digital_id_cards`, `polls`, `poll_votes`, `forum_threads`, `forum_posts`, `anonymous_suggestions`

### 4.11 Admin & Operasional Lanjutan

| Fitur | Deskripsi |
|---|---|
| Multi-RT/RW Support | Kalau butuh scale ke level RW (beberapa RT), struktur data mendukung multi-tenant per RT |
| Inventaris Aset RT | Pendataan aset RT (kursi, sound system, tenda) yang bisa dipinjam warga, terpisah dari booking fasilitas fisik |
| Backup & Export Data | Admin bisa export seluruh data (penghuni, keuangan) ke Excel/PDF untuk arsip fisik/laporan tahunan |
| Mobile App / PWA | Progressive Web App agar aplikasi bisa "diinstall" di HP warga tanpa perlu App Store |

**Model data baru:** `assets`, `asset_loans`

### 4.12 Landing Page / Frontpage Publik

Berbeda dari modul-modul sebelumnya yang berada di balik login, ini adalah **halaman publik** (tidak perlu autentikasi) yang jadi wajah depan SIWarga — bisa diakses siapa saja termasuk calon warga, tamu, atau vendor yang ingin tahu profil komplek.

| Fitur | Deskripsi |
|---|---|
| Hero/Banner Custom | Bagian utama landing page dengan gambar/banner yang bisa di-custom oleh Admin (upload gambar, ganti teks) tanpa perlu ubah kode setiap saat — gambar disimpan sebagai aset (mirip pola upload foto KTP yang sudah ada), Admin cukup ganti dari dashboard |
| Halaman Pengumuman/Blog Publik | Versi publik dari modul Pengumuman (4.1) — pengumuman yang ditandai "publik" oleh Admin ditampilkan di sini sebagai artikel/blog, dengan slug URL SEO-friendly |
| Daftar Kegiatan & Upcoming Events | Kalender/list kegiatan RT (kerja bakti, arisan, perayaan) dengan status Akan Datang / Sedang Berlangsung / Selesai, bisa ditampilkan publik atau khusus warga |
| Dokumentasi Kegiatan (Galeri) | Album foto/video dari kegiatan yang sudah selesai, dikelompokkan per kegiatan, dengan caption |
| Profil Komplek | Sejarah singkat, jumlah rumah, fasilitas yang tersedia, kontak pengurus — konten statis yang di-manage Admin |
| Kontak/CTA | Form kontak untuk calon warga/vendor yang ingin menghubungi pengurus RT |

**Model data baru:** `pages` (konten statis semi-custom seperti hero & profil), `events` (kegiatan RT), `event_documentation` (galeri per kegiatan), `media_assets` (gambar/video terpusat, reusable across modul)

**Catatan teknis:**
- Landing page dibangun sebagai **aplikasi Astro terpisah**, bukan bagian dari React SPA yang sudah ada. Alasannya: Astro cocok untuk konten publik yang mengutamakan SEO & performa (static/server-rendered by default, minim JS di client), sementara area login (`/app`) tetap di React SPA existing yang memang butuh interaktivitas tinggi. Kedua aplikasi ini di-deploy sebagai service terpisah (subdomain berbeda, misal `siwarga.domain.com` untuk landing page publik dan `app.siwarga.domain.com` untuk area login), sama-sama mengonsumsi API Laravel yang sama.
- Astro mengambil data pengumuman publik, kegiatan, dan galeri dari endpoint API Laravel yang sama (read-only, tanpa autentikasi untuk konten yang ditandai publik) — jadi tidak perlu duplikasi database.
- "Custom by code terkait gambar-gambar" diterjemahkan sebagai: Admin punya CMS ringan (bukan hardcode di source code) untuk mengganti gambar hero/banner/galeri lewat dashboard React (area login), disimpan ke storage (pola serupa `storage:link` yang sudah dipakai untuk foto KTP di SIWarga v1) — lalu Astro cukup fetch & render dari API tersebut saat build/request, tanpa perlu redeploy kode setiap ganti gambar.
- `events` bisa reuse relasi ke `facility_bookings` (4.5) kalau kegiatan tersebut memakai fasilitas RT, dan ke `announcements` (4.1) untuk notifikasi kegiatan baru.
- Rendering mode Astro yang disarankan: **hybrid** — halaman yang jarang berubah (Profil Komplek, Kontak) bisa static, sedangkan Pengumuman/Blog dan Daftar Kegiatan yang sering update sebaiknya server-rendered (SSR) atau di-revalidate berkala agar tidak perlu rebuild manual tiap ada konten baru.

## 5. Role & Permission Tambahan

| Role | Akses Baru di v2 |
|---|---|
| **Admin** | Full akses semua modul baru |
| **Bendahara** | Kelola pengumuman kategori Keuangan, lihat laporan publik |
| **Warga** | Lihat pengumuman, buat tiket pengaduan, booking fasilitas, panic button, lihat laporan keuangan publik |
| **Satpam** *(baru)* | Live CCTV, buku tamu, jadwal ronda, terima notifikasi panic button — tanpa akses keuangan/data pribadi penghuni sensitif |

## 6. Pertimbangan Teknis

- **Backend:** tetap Laravel 13, tambah domain baru per modul mengikuti pola existing (`Controllers/Api`, `Policies`, `Services`).
- **Frontend (area login):** tetap React 19 + TanStack Router/Query, tambah `features/` baru: `announcements`, `cctv`, `security`, `tickets`, `bookings`.
- **Frontend (landing page publik):** **Astro**, aplikasi terpisah dari React SPA, konsumsi API Laravel yang sama (endpoint publik/read-only untuk pengumuman, kegiatan, galeri). Lihat detail di 4.12.
- **Realtime:** untuk notifikasi panic button & update tiket, pertimbangkan Laravel Reverb (WebSocket) atau polling ringan via TanStack Query bila skala kecil (puluhan rumah) belum butuh WebSocket penuh.
- **CCTV bridge:** komponen infrastruktur terpisah (MediaMTX/go2rtc), di-deploy sebagai service tambahan di `docker-compose.yml`, tidak masuk kode aplikasi Laravel/React.
- **WhatsApp Gateway:** **WAHA (WhatsApp HTTP API)**, reuse pengalaman integrasi dari proyek lain (Perumnas Asabri Bumiayu Indah). Di-deploy sebagai service Docker terpisah, dipanggil dari Laravel via HTTP untuk broadcast pengumuman (4.1), reminder tagihan jatuh tempo (4.6), dan notifikasi panic button (4.3). Karena WAHA berbasis session WhatsApp Web (bukan WhatsApp Business API resmi Meta), perlu diperhatikan: nomor pengirim harus tetap aktif/ter-scan QR, ada risiko rate-limit/banned kalau volume broadcast terlalu tinggi dalam waktu singkat, sehingga broadcast masif (misal ke puluhan rumah sekaligus) sebaiknya di-throttle/dijeda antar pesan.

## 7. Fase Pengembangan (Usulan)

Total fitur di seluruh modul v2 (4.1–4.12) berjumlah **~47 fitur konkret** — melebihi 33 yang kamu ingat, karena ini mencakup semua kemungkinan kategori modernisasi. Anggap ini superset: kita bisa pangkas ke ~33 dengan membuang yang paling opsional/tergantung demografi (misal Kalender Ibadah, Marketplace) kalau memang tidak relevan.

| Fase | Modul | Alasan Prioritas |
|---|---|---|
| **Fase 0** | Landing Page/Frontpage (Hero, Profil Komplek, Kontak) | Wajah publik pertama, dampak langsung ke citra & kepercayaan warga/calon warga; tidak bergantung modul lain |
| **Fase 1** | Pengumuman & Komunikasi, Polling & Voting, Forum Diskusi, Blog Publik (bagian dari Landing Page) | Dependency ringan, dampak langsung ke transparansi & komunikasi harian |
| **Fase 2** | Pengaduan/Ticketing, Kotak Saran Anonim | Fitur mandiri, tidak butuh infra tambahan |
| **Fase 3** | Booking Fasilitas, Inventaris Aset RT, Daftar Kegiatan & Dokumentasi Kegiatan | Melengkapi operasional, terhubung ke modul keuangan & landing page existing |
| **Fase 4** | Keamanan — Buku Tamu, Panic Button, Kartu Keluarga Digital | Butuh desain notifikasi real-time & QR |
| **Fase 5** | Payment Gateway, Backup & Export Data, Mobile App/PWA | Integrasi eksternal & kenyamanan akses |
| **Fase 6** | Keamanan — Integrasi CCTV, IoT (Smart Gate, Sensor) | Paling kompleks secara infrastruktur (media bridge, MQTT, kamera/sensor fisik), dikerjakan terakhir |
| **Fase 7 (opsional)** | Marketplace/UMKM, Peta Interaktif, Cuaca, Kalender Ibadah, Multi-RT/RW | Nice-to-have, tergantung kebutuhan spesifik komplek — bisa di-drop kalau tidak relevan |

## 8. Hal yang Perlu Diputuskan Lebih Lanjut

- Merk/tipe CCTV & NVR yang akan dipakai — menentukan apakah support RTSP standar atau butuh SDK vendor tertentu.
- Kebijakan privasi akses CCTV untuk warga biasa (apakah dilarang total, atau terbatas pada snapshot tertentu).
- Apakah panic button perlu integrasi ke pihak eksternal (misal kontak RW/kepolisian setempat) atau cukup internal.
- Biaya sewa fasilitas — apakah wajib terhubung ke modul iuran/tagihan existing atau dicatat terpisah sebagai pemasukan lain.

---

*Dokumen ini adalah draft awal untuk didiskusikan lebih lanjut sebelum masuk tahap desain database (ERD) dan implementasi.*