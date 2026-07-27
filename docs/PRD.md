# Product Requirements Document (PRD)
## SIWarga — Sistem Informasi Manajemen Administrasi RT

| | |
|---|---|
| **Dokumen** | PRD v1.0 |
| **Konteks** | Skill Fit Test — PT Beon Intermedia (JagoanHosting), dilanjutkan sebagai aplikasi produksi untuk perumahan pribadi |
| **Tanggal** | 27 Juli 2026 |
| **Penyusun** | Ahmad |
| **Status** | Draft untuk implementasi |

---

## 1. Latar Belakang & Tujuan

RT di sebuah perumahan elite (20 rumah — 15 dihuni tetap, 5 kontrak/kosong berkala) saat ini mengelola iuran bulanan (satpam & kebersihan) dan pengeluaran operasional secara manual. Dibutuhkan aplikasi web untuk:

1. Mendigitalisasi pencatatan penghuni, rumah, dan histori huniannya.
2. Mengotomasi penagihan iuran bulanan/tahunan sesuai status rumah dan penghuni.
3. Mencatat pengeluaran operasional RT.
4. Menyediakan laporan keuangan (saldo, grafik pemasukan-pengeluaran) untuk transparansi ke warga.
5. Membatasi akses fitur berdasarkan peran (RBAC) — RT/Admin, Bendahara, Warga.

### 1.1 Tujuan Proyek
- Memenuhi seluruh kriteria skill test dari Beon Intermedia (lihat Lampiran A).
- Menghasilkan aplikasi yang layak dipakai jangka panjang di perumahan tempat tinggal penulis, bukan sekadar demo.

### 1.2 Non-Tujuan (Out of Scope v1)
- Payment gateway / pembayaran online otomatis (transaksi dicatat manual oleh bendahara).
- Notifikasi WhatsApp/email otomatis ke warga.
- Aplikasi mobile native.
- Multi-tenant (multi-perumahan dalam satu instance) — versi ini single-tenant per deployment.

---

## 2. Target Pengguna & Role (RBAC)

| Role | Deskripsi | Akses Utama |
|---|---|---|
| **Admin (RT)** | Ketua RT / pengelola utama | Full access: kelola penghuni, rumah, jenis iuran, generate tagihan, kelola user & role, semua laporan |
| **Bendahara** | Pengelola keuangan | Kelola pembayaran, catat pengeluaran, lihat & generate laporan. Tidak bisa kelola master data penghuni/rumah/user |
| **Warga** | Penghuni tetap/kontrak | Lihat tagihan & histori pembayaran milik rumahnya sendiri saja (read-only, scoped) |

Hak akses diatur granular per permission (contoh: `residents.create`, `bills.generate`, `payments.create`, `reports.view`), bukan hardcode per role, agar fleksibel diubah dari sisi data tanpa deploy ulang kode. Lihat detail skema di `siwarga-erd.dbml` (tabel `roles`, `permissions`, `role_permissions`, `user_roles`).

---

## 3. Arsitektur & Tech Stack

Aplikasi menggunakan pola **API-first / headless (decoupled)** — backend dan frontend adalah dua project terpisah yang berkomunikasi via REST API dan JWT/Sanctum token. Ini **bukan microservice** (satu service backend monolitik, satu database), sesuai kriteria "backend dan frontend dibuat secara terpisah".

```
┌─────────────────────┐        REST API (JSON)        ┌──────────────────────┐
│   Frontend (React)  │ ─────────────────────────────▶ │   Backend (Laravel)  │
│   shadcn-admin       │ ◀───────────────────────────── │   Laravel Sanctum     │
│   Vite + TypeScript  │        Bearer Token Auth        │   MySQL               │
└─────────────────────┘                                  └──────────────────────┘
```

| Layer | Teknologi |
|---|---|
| Backend framework | Laravel 11.x |
| Auth API | Laravel Sanctum (token-based) |
| Database | MySQL 8.x |
| Frontend | React 18 + TypeScript + Vite |
| UI Kit | shadcn/ui — template **shadcn-admin** |
| State/data fetching | TanStack Query (React Query) |
| Charting | Recharts |
| Form handling | React Hook Form + Zod |
| Backend testing | PHPUnit / Pest, Laravel HTTP Tests |
| Frontend unit testing | Vitest + React Testing Library |
| E2E testing | Playwright |

Deployment lokal tanpa Docker (sesuai ketentuan test) — instalasi native PHP/Composer/Node di masing-masing environment, didokumentasikan lengkap di README instalasi.

### 3.1 Strategi Environment Development vs Delivery

Ketentuan test melarang **"Docker sebagai basicnya"** — artinya deliverable akhir (instalasi & repo yang di-submit) tidak boleh bergantung pada Docker, tapi tool development sehari-hari bebas dipilih.

**Keputusan:** menggunakan **Laravel Sail** selama development lokal (menghindari bentrok port MySQL/PHP dengan environment kerja kantor via `.env`: `APP_PORT`, `FORWARD_DB_PORT`), namun delivery final tetap native.

Checklist sebelum submit/push final:
- [ ] `docker-compose.yml` tidak ikut ter-commit ke repo yang dikirim (masuk `.gitignore` sejak awal, atau dihapus di commit terakhir).
- [ ] README instalasi ditulis murni dengan command native (`php artisan migrate`, `composer install`, `npm install`) — **tidak** menyisakan command `sail ...`.
- [ ] Panduan instalasi native divalidasi ulang dari clean clone di environment tanpa Docker/Sail sebelum dikirim, memastikan tidak gagal (kegagalan panduan instalasi = dianggap gagal, sesuai ketentuan test).
- [ ] `laravel/sail` boleh tetap ada sebagai dev-dependency di `composer.json` (legal, murni untuk kenyamanan lokal) selama tidak jadi prasyarat instalasi di README.

---

## 4. Skema Data (Ringkasan)

Detail lengkap ada di file `siwarga-erd.dbml` (dapat di-import ke dbdiagram.io). Entitas utama:

- `residents` — data penghuni (nama, foto KTP, status kontrak/tetap, no. HP, status nikah)
- `houses` — data rumah (nomor, status dihuni/kosong)
- `house_residents` — pivot + histori hunian (start_date/end_date)
- `due_types` — jenis iuran (Satpam 100k, Kebersihan 15k)
- `bills` — tagihan per penghuni per periode
- `payments` — transaksi pembayaran atas tagihan
- `expenses` — pengeluaran operasional RT
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles` — RBAC

---

## 5. Modul & Fitur Detail

### 5.1 Modul Autentikasi
- Login (email + password) → token Sanctum.
- Logout.
- Middleware proteksi route berdasarkan permission per role.
- **Acceptance Criteria:** user tanpa permission terkait tidak bisa mengakses endpoint/menu terkait (403), sidebar frontend menyesuaikan menu sesuai role.

### 5.2 Modul Kelola Penghuni
- Tambah / ubah data penghuni: nama lengkap, foto KTP (upload), status kontrak/tetap, no. telepon, status pernikahan.
- List penghuni dengan filter status & pencarian nama.
- **Acceptance Criteria:** validasi wajib isi semua field, preview foto KTP sebelum submit, foto tersimpan dan bisa dilihat kembali di detail.

### 5.3 Modul Kelola Rumah
- Tambah / ubah data rumah (nomor rumah, alamat).
- Assign / ubah penghuni ke rumah tertentu → otomatis membuat entri baru di `house_residents` dan menutup (`end_date`) entri penghuni sebelumnya jika ada.
- Detail rumah menampilkan **histori seluruh penghuni** yang pernah tinggal (timeline).
- Status rumah (dihuni/tidak dihuni) dihitung otomatis dari ada/tidaknya `house_residents` aktif.
- **Acceptance Criteria:** rumah tidak bisa dihapus jika punya histori transaksi; pindah penghuni tidak menghapus data penghuni lama, hanya menutup periode huniannya.

### 5.4 Modul Kelola Iuran & Tagihan
- Master jenis iuran (nama, nominal, siklus bulanan/fleksibel) dikelola Admin.
- **Generate tagihan bulanan** (aksi manual oleh Admin/Bendahara, dipicu dari UI):
  - 15 rumah tetap → selalu ditagih tiap bulan.
  - 5 rumah kontrak/kosong → hanya ditagih jika ada `house_residents` aktif pada bulan tersebut.
  - Iuran kebersihan mendukung periode tahunan (1 tagihan mencakup 12 bulan) jika dipilih; iuran satpam default bulanan.
- List tagihan dengan filter: bulan, status (lunas/belum lunas), rumah.
- **Acceptance Criteria:** generate tagihan tidak boleh duplikat untuk kombinasi rumah + jenis iuran + periode yang sama (idempotent).

### 5.5 Modul Pembayaran
- Catat pembayaran terhadap sebuah tagihan (nominal, tanggal bayar, catatan) → status tagihan otomatis jadi "lunas" jika nominal terpenuhi.
- Histori pembayaran per rumah/per penghuni.
- **Acceptance Criteria:** satu tagihan bisa dilihat status pembayarannya dengan jelas beserta siapa penghuni & rumah terkait.

### 5.6 Modul Pengeluaran
- Catat pengeluaran (kategori, deskripsi, nominal, tanggal).
- List & filter pengeluaran per bulan.
- **Acceptance Criteria:** kategori bebas diisi/dipilih (perbaikan jalan, gaji satpam, token listrik pos satpam, dll).

### 5.7 Modul Laporan & Dashboard
- **Dashboard ringkasan**: grafik pemasukan vs pengeluaran per bulan selama 1 tahun (bar/line chart), saldo berjalan.
- **Laporan detail per bulan**: rincian seluruh pemasukan (pembayaran) dan pengeluaran pada bulan tertentu, dengan saldo akhir.
- **Acceptance Criteria:** grafik dapat difilter per tahun; data laporan bisa diakses Admin & Bendahara.

### 5.8 Modul Manajemen User & Role (Admin only)
- CRUD user, assign role.
- CRUD role & permission (opsional untuk v1 — minimal seed 3 role default sudah cukup memenuhi kriteria RBAC; UI pengaturan permission granular bisa jadi fitur v1.1 jika waktu terbatas).

---

## 6. API Endpoints (Ringkasan)

| Method | Endpoint | Deskripsi | Role |
|---|---|---|---|
| POST | `/api/login` | Login | Public |
| POST | `/api/logout` | Logout | Authenticated |
| GET/POST | `/api/residents` | List / tambah penghuni | Admin |
| PUT | `/api/residents/{id}` | Ubah penghuni | Admin |
| GET/POST | `/api/houses` | List / tambah rumah | Admin |
| PUT | `/api/houses/{id}` | Ubah rumah | Admin |
| GET | `/api/houses/{id}/history` | Histori penghuni rumah | Admin, Bendahara |
| POST | `/api/houses/{id}/assign-resident` | Assign penghuni ke rumah | Admin |
| GET/POST | `/api/due-types` | Kelola jenis iuran | Admin |
| POST | `/api/bills/generate` | Generate tagihan periode berjalan | Admin, Bendahara |
| GET | `/api/bills` | List tagihan (filter bulan/status) | Admin, Bendahara, Warga (scoped) |
| POST | `/api/payments` | Catat pembayaran | Admin, Bendahara |
| GET | `/api/payments` | Histori pembayaran | Admin, Bendahara, Warga (scoped) |
| GET/POST | `/api/expenses` | List / tambah pengeluaran | Admin, Bendahara |
| GET | `/api/reports/summary` | Data grafik tahunan | Admin, Bendahara |
| GET | `/api/reports/monthly/{year}/{month}` | Detail laporan bulan tertentu | Admin, Bendahara |
| GET/POST | `/api/users` | Kelola user | Admin |
| GET/POST | `/api/roles` | Kelola role & permission | Admin |

---

## 7. Strategi Testing

Testing dibagi 3 lapis, wajib ada di kedua project (backend & frontend) sebagai bukti kualitas kode untuk skill test.

### 7.1 Backend (Laravel — PHPUnit/Pest)

**Unit test** (`tests/Unit`):
- Business logic murni tanpa DB/HTTP: kalkulasi status rumah dari histori hunian, kalkulasi apakah tagihan berlaku untuk rumah kontrak (ada penghuni aktif atau tidak), kalkulasi saldo laporan.

**Integration/Feature test** (`tests/Feature`):
- Test endpoint API end-to-end dengan database testing (SQLite in-memory atau MySQL test DB via RefreshDatabase).
- Contoh skenario wajib:
  - Generate tagihan tidak duplikat untuk periode yang sama.
  - Generate tagihan rumah kontrak kosong → tidak menghasilkan bill.
  - Pindah penghuni menutup histori lama dan membuka histori baru.
  - Pembayaran mengubah status bill jadi lunas.
  - User tanpa permission mendapat 403 saat akses endpoint terlarang.
  - Login gagal dengan kredensial salah.

### 7.2 Frontend (React — Vitest + React Testing Library)

**Unit test**:
- Komponen form (validasi Zod), util formatting (rupiah, tanggal), komponen tabel filter/sort.

**Integration test**:
- Alur form tambah penghuni dari input sampai pemanggilan service (dengan API di-mock via MSW — Mock Service Worker).
- Render dashboard dengan data dummy/mock → memastikan grafik & saldo tampil sesuai data.

### 7.3 End-to-End (Playwright)

Skenario kritis dijalankan di browser sungguhan terhadap aplikasi penuh (frontend + backend):
1. Login sebagai Admin → tambah penghuni baru → muncul di list.
2. Tambah rumah → assign penghuni → cek histori hunian tampil benar.
3. Generate tagihan bulan berjalan → cek tagihan muncul dengan status "belum lunas".
4. Catat pembayaran → status tagihan berubah jadi "lunas".
5. Login sebagai Warga → hanya bisa melihat tagihan miliknya sendiri (tidak bisa lihat rumah lain).
6. Dashboard menampilkan grafik sesuai data yang sudah di-generate.

### 7.4 Target Coverage
- Backend: minimum 70% coverage pada `app/Services` dan `app/Http/Controllers`.
- Frontend: minimum 60% coverage pada komponen form & util kritikal.
- Seluruh skenario E2E di atas (poin 7.3) **wajib lulus** sebelum dianggap selesai — ini prioritas lebih tinggi dari angka coverage.

### 7.5 CI (opsional, nilai tambah)
Jika waktu memungkinkan, setup GitHub Actions untuk menjalankan `phpunit`, `vitest`, dan `playwright` otomatis di setiap push — memperkuat kesan profesionalisme di repo untuk penilaian.

---

## 8. Struktur Repository

```
siwarga/
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   ├── Services/         # business logic (generate bill, dsb)
│   │   └── Policies/         # RBAC authorization
│   ├── database/migrations/
│   ├── database/seeders/     # seed role, permission, due_types default
│   └── tests/
│       ├── Unit/
│       └── Feature/
├── frontend/                 # React (shadcn-admin)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/          # API layer (dummy → real API)
│   │   ├── types/              # kontrak tipe sesuai ERD
│   │   └── tests/
│   ├── e2e/                    # Playwright specs
│   └── vitest.config.ts
├── docs/
│   └── siwarga-erd.dbml
└── README.md                   # panduan instalasi lengkap
```

---

## 9. Rencana Kerja & Milestone (5 Hari)

| Hari | Fokus |
|---|---|
| 1 | Frontend: setup shadcn-admin, routing halaman, dummy data + services layer sesuai tipe ERD |
| 2 | Frontend: modul Penghuni, Rumah (termasuk histori), form & tabel lengkap dengan dummy data |
| 3 | Frontend: modul Tagihan, Pembayaran, Pengeluaran, Dashboard & Laporan (chart) |
| 4 | Backend: migration, model, seeder RBAC, endpoint API sesuai kontrak, swap dummy → real API di frontend |
| 5 | Testing (unit/integration/e2e), perbaikan bug, dokumentasi instalasi, screenshot per fitur, submit |

---

## 10. Output Wajib (sesuai kriteria test)
1. **ERD** — `siwarga-erd.dbml`
2. **Repo Aplikasi** — backend & frontend terpisah, di-push ke Git
3. **Panduan Instalasi** — step-by-step lengkap dari clone sampai aplikasi jalan (termasuk `.env` setup, migration, seeding, `npm install`, `composer install`)
4. **Screenshot per fitur** — rangkuman visual tiap modul yang sudah berjalan
5. **Bukti testing** — output test run (unit, integration, e2e) disertakan di README atau folder `docs/test-results/`

---

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Waktu 5 hari terlalu sempit untuk semua fitur + 3 lapis testing | Prioritaskan fitur inti dulu (5.2–5.5), testing untuk skenario kritis saja (bukan 100% coverage) |
| Kompleksitas histori hunian (house_residents) bikin bug edge-case | Tulis unit test untuk logic ini di awal (test-first) sebelum lanjut ke UI |
| Panduan instalasi gagal di environment reviewer | Test instalasi dari clone bersih (fresh clone) di mesin/VM terpisah sebelum submit |

---

## Lampiran A — Referensi Kriteria Asli
Dokumen ini disusun berdasarkan brief "Skill Fit Test - Full Stack Programmer" dari PT Beon Intermedia (penguji: Rizal Faizal). Ketentuan wajib: tanpa Docker, backend Laravel, frontend React, DBMS MySQL, backend-frontend terpisah, output ERD + repo + panduan instalasi + screenshot per fitur.
