# Fase 5 Kenyamanan — Design Document

| | |
|---|---|
| **Proyek** | SIWarga v2 — Fase 5: Payment Generik, Export/Backup, PWA |
| **Tanggal** | 9 September 2026 |
| **Status** | Approved |
| **Dasar** | `docs/PRD-v2.md` §4.9 (parsial) + §4.11 (parsial); pola Fase 1–4 |

---

## 1. Latar Belakang & Scope

Fase 1–4 selesai di `develop`. Fase 5 mengerjakan **kenyamanan & integrasi
eksternal** dalam satu fase vertikal:

- **Payment generik + manual** — kontrak provider pluggable (Xendit +
  Simulator di fase ini; slot Midtrans/Duitku/Doku/PayPal) plus jalur
  transfer manual dengan upload bukti + verifikasi bendahara
- **Export & backup** — laporan PDF, data Excel, backup JSON arsip
- **PWA installable minimal** — manifest + service worker shell, tanpa
  offline data

Non-goals (parkir eksplisit): provider selain Xendit/Simulator (stub +
panduan saja), restore backup (berbahaya tanpa validasi skema), antrean
job untuk export (on-demand + throttle), offline data/action, dashboard
widget Fase 4, halaman verifikasi publik KK (backlog Fase 4).

## 2. Payment Generik + Manual

### 2.1 Kontrak provider

```php
interface PaymentProvider
{
    public function key(): string;                    // 'xendit', 'midtrans', ...
    public function createInvoice(PaymentTransaction $trx): ProviderInvoice;
    public function parseWebhook(Request $request): ProviderWebhook;  // reference + status
    public function verifySignature(Request $request): bool;
}
```

`ProviderInvoice { reference, payCode, qrPayload, expiresAt }`,
`ProviderWebhook { reference, status: paid|expired|failed, raw }`.
`PaymentProviderRegistry` resolve dari config `PAYMENT_PROVIDER`
(`xendit|midtrans|duitku|doku|paypal|simulator`, default `simulator` di
local/testing). Menambah provider = 1 class + 1 baris registrasi, tanpa
ubah core (didokumentasikan di `docs/` + stub `MidtransProvider` yang
throw `LogicException('belum diimplementasikan')` agar slot eksplisit).

Kanal generik lintas provider: `qris`, `va`, `ewallet`, `manual_transfer`
(kolom `channel`; provider memetakan ke API masing-masing).

### 2.2 `payment_transactions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `bill_id` | FK bills | tagihan dibayar |
| `user_id` | FK users | pembayar |
| `provider` | string | `xendit`, `simulator`, `manual` (+ slot lain) |
| `channel` | string | `qris`, `va`, `ewallet`, `manual_transfer` |
| `amount` | decimal 12,2 | = `bills.amount_due` saat dibuat |
| `status` | enum | `pending` → `paid`/`expired`/`failed`; manual: `pending` → `awaiting_verification` → `paid`/`rejected` |
| `reference` | string unique | referensi provider / kode manual |
| `idempotency_key` | string unique | anti double-proses webhook |
| `pay_code` | string nullable | nomor VA / payload QR |
| `expires_at` | datetime nullable | kedaluwarsa invoice |
| `proof_path` | string nullable | bukti transfer (manual, public disk, max 2MB jpg/png) |
| `verified_by` | FK users nullable | verifikator manual |
| `verified_at` | datetime nullable | |
| `rejection_reason` | string nullable | alasan tolak (sanitize HTML) |
| `paid_at` | datetime nullable | |

### 2.3 Alur Xendit/Simulator

1. `POST /api/payment-transactions` (warga, milik sendiri): validasi bill
   `belum_lunas` + miliknya → buat transaksi `pending` + panggil
   `createInvoice` → kembalikan `payCode`/QR untuk ditampilkan.
2. Webhook `POST /api/public/payments/webhook/{provider}` (publik):
   verifikasi signature → cari transaksi by `reference` → idempotency
   check → dalam transaksi DB: set `paid`, buat `Payment`
   (`bill_id`, `amount_paid=amount`, `payment_date=today`,
   `created_by=pembayar`), bill jadi `lunas` via logika existing →
   notifikasi DB ke pembayar. Double-delivery aman (second hit no-op).
3. Simulator: `payCode` dummy + endpoint dev-only
   `POST /api/payment-transactions/{id}/simulate-pay` (non-production,
   gate admin) agar e2e tanpa kredensial.

### 2.4 Alur manual

1. Warga buat transaksi `manual_transfer` + upload bukti → status
   `awaiting_verification`.
2. `POST /api/payment-transactions/{id}/verify` (bendahara/admin,
   permission `payments.verify`): `{approve: true}` → sama seperti
   muara sukses 2.3; `{approve: false, reason}` → `rejected` +
   notifikasi DB ke warga.
3. Bukti mengikuti pola upload existing (public disk, validasi mime +
   ukuran, hapus file bila transaksi ditolak/dihapus — pelajaran Fase 3).

### 2.5 RBAC payment

Permission baru: `payments.online` (buat transaksi online, warga),
`payments.verify` (verifikasi manual, bendahara/admin). `payments.create`
existing tetap untuk pencatatan manual bendahara. Webhook publik tanpa
auth (signature sebagai auth) + throttle ketat.

## 3. Export & Backup

| Endpoint | Akses | Format |
|---|---|---|
| `GET /api/reports/monthly/{y}/{m}/pdf` | Admin, Bendahara | PDF (kop RT, tabel, tanda tangan) |
| `GET /api/reports/summary/{y}/pdf` | Admin, Bendahara | PDF tahunan |
| `GET /api/exports/{dataset}/xlsx` | Admin (+bendahara untuk keuangan) | xlsx: `residents`, `houses`, `bills`, `payments`, `expenses` |
| `GET /api/backup/json` | Admin only | JSON seluruh domain + `{version, exported_at}` |

- PDF via `barryvdh/laravel-dompdf` (dep composer baru, MIT), reuse
  `ReportService::summary/monthly` existing sebagai sumber data.
- Excel via `maatwebsite/excel` (dep composer baru), chunking 1000/baris
  + filter `month` opsional untuk dataset keuangan; header Bahasa Indonesia.
- Backup JSON: satu payload `{meta, data: {domain: [...]}}` tanpa file
  lampiran biner (hanya path), soft-deleted ikut (`withTrashed`) agar
  arsip lengkap. Restore tidak di-scope.
- On-demand (tanpa queue), throttle `exports` (10/menit), catat
  ActivityLog (`export.laporan`, `export.data`, `backup.json`).

## 4. PWA Installable Minimal

- `public/manifest.webmanifest`: nama "SIWarga", `short_name`, ikon
  192/512 (+ maskable, reuse aset logo existing), `theme_color` +
  `background_color` dari tema, `display: standalone`, `start_url: /`.
- `public/sw.js` vanilla (tanpa plugin build): precache shell
  (dokumen navigasi + JS/CSS/ikon hasil build via daftarInject manual
  sederhana — cache-first versi), runtime cache-first untuk
  `/_assets|/assets` statis, **network-only untuk `/api/*`** (tanpa
  offline data), fallback `offline.html` untuk navigasi saat offline.
- Registrasi di `src/main.tsx` (hanya production,
  `if ('serviceWorker' in navigator && import.meta.env.PROD)`),
  update-flow: `skipWaiting` + toast "Versi baru tersedia, muat ulang".
- Kriteria Definition-of-Done: Lighthouse PWA "installable" ✓,
  e2e assert `manifest` link + `navigator.serviceWorker` ready.
- Ikon: reuse/generate dari logo existing (tidak desain ulang).

## 5. API & Frontend

| Method | Endpoint | Permission |
|---|---|---|
| GET/POST | `/api/payment-transactions` | `payments.online` (scoped milik sendiri; bendahara lihat semua via `payments.view.all`) |
| GET | `/api/payment-transactions/{id}` | pemilik / `payments.view.all` |
| POST | `/api/payment-transactions/{id}/verify` | `payments.verify` |
| POST | `/api/payment-transactions/{id}/simulate-pay` | non-production + admin |
| POST | `/api/public/payments/webhook/{provider}` | publik + signature, throttle |
| GET | `/api/reports/.../pdf`, `/api/exports/...`, `/api/backup/json` | sesuai §3 |

Frontend (`siwarga-payments-online`, `siwarga-exports`): halaman tagihan
warga bertombol "Bayar Online" (pilih kanal → tampil QR/VA + hitung
mundur kedaluwarsa + status auto-refresh) dan "Upload Bukti Transfer";
inbox verifikasi bendahara (setujui/tolak + alasan); halaman
Export/Backup admin (tombol unduh per dataset + backup JSON). Toast
Bahasa Indonesia; pola service/hook/fitur existing.

## 6. Testing

- **PHPUnit**: webhook idempoten (kirim 2x → 1 Payment), simulator
  pay → lunas, manual verify → lunas + bukti tersimpan,
  reject → notifikasi, PDF/Excel (assert content-type + magic bytes
  `%PDF`/`PK`), backup JSON memuat semua domain,
  RBAC (`payments.online`/`verify`, export guards), signature webhook
  salah → 403.
- **E2E** `fase-5-convenience.spec.ts`: simulator bayar → bill lunas;
  upload bukti → verifikasi → lunas; unduh PDF laporan; manifest +
  service worker terdaftar.
- Verifikasi penuh: `composer test`, `npm run build`, `npm run test`,
  full Playwright (triage pre-existing seperti siklus sebelumnya).

## 7. Dependensi & Config Baru

- Composer: `barryvdh/laravel-dompdf`, `maatwebsite/excel` (butuh
  persetujuan user saat eksekusi — keduanya MIT, standar industri).
- Config: `PAYMENT_PROVIDER`, `XENDIT_SECRET_KEY`,
  `XENDIT_CALLBACK_TOKEN` (`.env.example` + validasi saat boot bila
  provider=xendit).
- Tanpa dep frontend baru; tanpa perubahan skema Fase 1–4
  (non-breaking; `payments`/`bills` hanya ditambah baris).
