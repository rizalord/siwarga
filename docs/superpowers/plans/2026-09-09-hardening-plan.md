# Hardening Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Fase 4 + Fase 5 final-review backlog: public KK verify page, emergency-contacts admin UI, dashboard widgets, Bahasa notification labels, payment double-spend lock + Xendit auth check + channel mapping, NIK/export validation, guest index, SW guards, and assorted minors — backend + frontend + tests.

**Architecture:** Five small vertical slices (two frontend-only, one backend safety, one validation/infra sweep, one e2e). No new tables except one index migration; no new permissions; no new dependencies. Payment safety centers on a bill-level lock inside the existing `finalizePaid()` transaction.

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, vanilla SW.

**Spec:** `docs/superpowers/specs/2026-09-09-hardening-design.md` (all 4 sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Toasts and UI copy in Bahasa Indonesia; reuse existing patterns (DataTable, Header/Main, `useHasPermission`, service/hook shape).
- Public verify page exposes ONLY head name + house number + address (never NIK) — same contract as the API it calls.
- Xendit auth change ONLY if docs confirm Basic; launch stays simulator-only otherwise — verify via web lookup first, document the verdict in the report.
- No MSW handlers exist for the touched domains — none to update.
- Still parked (do NOT touch): patrol soft-delete/unique, houseless 422 text, bespoke history table, sidebar breadth, retry-button naming, restore backup, non-Xendit providers.

---

## File map

| File | Responsibility |
|---|---|
| `src/routes/verifikasi-keluarga.$token.tsx` (new) | public verify route |
| `src/features/siwarga-family/household-verify-page.tsx` (new) | VALID/invalid card |
| `src/services/emergency-contacts.ts`, `src/hooks/use-emergency-contacts.ts` (new) | contacts client (read shared, write admin) |
| `src/features/siwarga-panic/emergency-contacts-page.tsx` (new) | admin CRUD UI |
| `src/routes/_authenticated/emergency-contacts/index.tsx` (new) | admin route + schema |
| `src/features/siwarga-dashboard/security-widgets.tsx` (new) | panic/guest/patrol widgets |
| `src/features/siwarga-notifications/notifications-page.tsx` | Bahasa status map |
| `app/Services/PaymentTransactionService.php` | bill lock, verified_by/at inside tx |
| `app/Payments/XenditProvider.php` | Basic auth (if confirmed) + channel mapping |
| `app/Http/Controllers/Api/PaymentTransactionController.php` | proof() cleanup, bank_code rule |
| `app/Http/Controllers/Api/FamilyMemberController.php` | NIK 16-digit rule |
| `app/Http/Controllers/Api/ExportController.php` | clamp + log-after-generate |
| `database/migrations/2026_09_10_000007_add_guest_logs_registrar_status_index.php` (new) | guest index |
| `public/sw.js` | GET/ok/same-origin guards |
| `src/services/exports.ts`, `src/types/api.ts` | Safari-safe download, looser notif type |
| `src/frontend/e2e/siwarga/fase-6-hardening.spec.ts` (new) | e2e |

---

### Task 1: public verify page + contacts admin UI (frontend only)

**Files:**
- Create: `src/features/siwarga-family/household-verify-page.tsx`
- Create: `src/routes/verifikasi-keluarga.$token.tsx`
- Create: `src/services/emergency-contacts.ts`
- Create: `src/hooks/use-emergency-contacts.ts`
- Create: `src/features/siwarga-panic/emergency-contacts-page.tsx`
- Create: `src/routes/_authenticated/emergency-contacts/index.tsx`
- Modify: `src/components/layout/data/sidebar-data.ts` (Kontak Darurat entry, `emergency-contacts.manage`, in Keamanan group)
- Modify: `src/features/siwarga-panic/panic-page.tsx` (reuse read hook IF it currently fetches ad-hoc — check first; if already via a hook/service, skip with a note)

**Interfaces:**
- Consumes: `GET /api/public/households/{token}` → `{data: {house_number, address, head_name}}`, 404 invalid; `GET/POST/PUT/DELETE /api/emergency-contacts` (existing, Task 4 Fase 4).
- Produces: public route `/verifikasi-keluarga/$token`; `useEmergencyContacts` (all) + `useCreateContact/useUpdateContact/useDeleteContact` (admin); hooks consumed by Task 5 e2e.

- [ ] **Step 1: Write the verify page + public route**

`src/features/siwarga-family/household-verify-page.tsx`:

```tsx
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import api from '@/services/api'
import { Main } from '@/components/layout/main'

interface VerifyResponse {
  data: { house_number: string; address: string | null; head_name: string }
}

export function HouseholdVerifyPage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const { data, isLoading, isError } = useQuery({
    queryKey: ['household-verify', token],
    queryFn: () =>
      api.get<VerifyResponse>(`/api/public/households/${token}`).then((r) => r.data),
    retry: false,
  })

  return (
    <Main className='flex min-h-screen items-center justify-center'>
      <div className='w-full max-w-md rounded-lg border p-6 text-center'>
        <h1 className='text-xl font-bold'>Verifikasi Kartu Keluarga</h1>
        {isLoading && <p className='mt-4 text-muted-foreground'>Memeriksa...</p>}
        {isError && (
          <div className='mt-4'>
            <ShieldAlert className='mx-auto h-10 w-10 text-destructive' />
            <p className='mt-2 font-semibold'>Kode tidak valid</p>
            <p className='text-sm text-muted-foreground'>QR ini tidak terdaftar di SIWarga.</p>
          </div>
        )}
        {data && (
          <div className='mt-4 space-y-1'>
            <BadgeCheck className='mx-auto h-10 w-10 text-green-600' />
            <p className='font-semibold text-green-700'>TERVERIFIKASI</p>
            <p className='text-lg font-bold'>{data.data.head_name}</p>
            <p>Rumah {data.data.house_number}</p>
            <p className='text-sm text-muted-foreground'>{data.data.address}</p>
          </div>
        )}
      </div>
    </Main>
  )
}
```

`src/routes/verifikasi-keluarga.$token.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { HouseholdVerifyPage } from '@/features/siwarga-family/household-verify-page'

export const Route = createFileRoute('/verifikasi-keluarga/$token')({
  component: HouseholdVerifyPage,
})
```

Note: NO `Header`/auth layout (public). If `Main` requires auth context, use a plain `div` instead — check `Main` first.

- [ ] **Step 2: Write contacts service + hooks**

`src/services/emergency-contacts.ts`:

```ts
import type { ApiResponse, EmergencyContact, PaginatedResponse } from '@/types/api'
import api from './api'

export interface EmergencyContactInput {
  name: string
  phone: string
  sort_order?: number
}

export const emergencyContactsService = {
  getAll: () =>
    api.get<PaginatedResponse<EmergencyContact>>('/api/emergency-contacts', {
      params: { per_page: 50 },
    }),
  create: (input: EmergencyContactInput) =>
    api.post<ApiResponse<EmergencyContact>>('/api/emergency-contacts', input),
  update: (id: number, input: Partial<EmergencyContactInput>) =>
    api.put<ApiResponse<EmergencyContact>>(`/api/emergency-contacts/${id}`, input),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/emergency-contacts/${id}`),
}
```

`src/hooks/use-emergency-contacts.ts`: `useEmergencyContacts` (query `['emergency-contacts']`, select data) + create/update/delete mutations with toasts ('Kontak darurat disimpan' / 'Kontak darurat dihapus' / 'Gagal...' errors), invalidating `['emergency-contacts']`.

- [ ] **Step 3: Write the admin page + route + sidebar**

`src/features/siwarga-panic/emergency-contacts-page.tsx`: Header/Main layout, table (name/phone/sort_order) with add/edit dialog (name/phone/sort_order fields) + delete confirm, all mutations from the hook. Gate the whole page content behind `useHasPermission('emergency-contacts.manage')` with a "Tidak punya akses" fallback (route has no `can` middleware — check: Fase 4 routes show GET without gate, write with gate; page-level guard needed since route file can't `can`-gate. Add route WITHOUT middleware needs no route change — backend already gated).

Wait — routes are backend-fixed; this task only adds the frontend route file:

`src/routes/_authenticated/emergency-contacts/index.tsx`:

```tsx
import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { EmergencyContactsPage } from '@/features/siwarga-panic/emergency-contacts-page'

const schema = z.object({ page: z.number().optional().catch(1) })

export const Route = createFileRoute('/_authenticated/emergency-contacts/')({
  validateSearch: schema,
  component: EmergencyContactsPage,
})
```

Sidebar: add `Kontak Darurat` (`/emergency-contacts`, `emergency-contacts.manage`) to the Keamanan group (find it).

- [ ] **Step 4: Verify with build**

Run: `npm run build` (in `src/frontend/`)
Expected: clean build (routeTree.gen.ts updates automatically — commit it, Fase 4 precedent).

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add src/features/siwarga-family/household-verify-page.tsx src/routes/verifikasi-keluarga.\$token.tsx src/services/emergency-contacts.ts src/hooks/use-emergency-contacts.ts src/features/siwarga-panic/emergency-contacts-page.tsx src/routes/_authenticated/emergency-contacts/index.tsx src/components/layout/data/sidebar-data.ts src/routeTree.gen.ts src/features/siwarga-panic/panic-page.tsx
git commit -m "feat: add public KK verify page and emergency contacts admin UI"
```

---

### Task 2: dashboard widgets + Bahasa labels (frontend only)

**Files:**
- Create: `src/features/siwarga-dashboard/security-widgets.tsx`
- Modify: `src/features/siwarga-dashboard/index.tsx`
- Modify: `src/features/siwarga-notifications/notifications-page.tsx`

**Interfaces:**
- Consumes: `usePanicAlerts({status:'active', per_page:1})` (total from paginated meta), `useGuestLogs({date: today})`, `usePatrols({from: today})`, `useHasPermission`, existing hooks files (import from them — do NOT duplicate fetch logic).
- Produces: widgets consumed by Task 5 e2e (role-conditional render).

- [ ] **Step 1: Write the widgets component**

`src/features/siwarga-dashboard/security-widgets.tsx`:

```tsx
import { Link } from '@tanstack/react-router'
import { Siren, DoorOpen, CalendarClock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHasPermission } from '@/hooks/use-permission'
import { usePanicAlerts } from '@/hooks/use-panic'
import { useGuestLogs } from '@/hooks/use-guest-logs'
import { usePatrols } from '@/hooks/use-patrols'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SecurityWidgets() {
  const canHandle = useHasPermission('panic-alerts.handle')
  const canGuest = useHasPermission('guest-logs.view')
  const canPatrol = useHasPermission('patrol-schedules.view')
  const { data: panic } = usePanicAlerts({ status: 'active', per_page: 1 })
  const { data: guests } = useGuestLogs({ date: todayISO(), per_page: 1 })
  const { data: patrols } = usePatrols({ from: todayISO(), per_page: 1 })

  // Verify each hook's paginated select shape first (data.data vs data.meta?).
  // Paginated select in this codebase returns the full paginated payload —
  // read total via `?.total`. If a hook lacks these params, extend its Filter
  // type minimally (date/from already exist per Fase 4 plan).
  ...
}
```

Render: if `canHandle` → cards "Panic Aktif" (total + link `/panic`) and "Tamu Hari Ini" (total + link `/guest-logs`); always (patrol perm) → "Ronda Berikutnya" (first item date/shift/personnel or "Belum ada jadwal"); if NOT canHandle → big red shortcut button linking `/panic` ("Lapor Darurat"). Indonesian copy throughout. Keep it compact (~120 lines).

- [ ] **Step 2: Mount in dashboard + extend Bahasa map**

`index.tsx`: render `<SecurityWidgets />` between the header block and SummaryCards (inside the loaded branch so hooks don't fire twice pointlessly — actually mount inside the `<>` fragment after SummaryCards; simplest: right after the title div, outside loading gate — widgets have own loading states).

`notifications-page.tsx` STATUS_LABELS — extend to:

```ts
const STATUS_LABELS: Record<string, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  active: 'Aktif',
  handled: 'Ditangani',
  cancelled: 'Dibatalkan',
  pending: 'Menunggu',
  paid: 'Lunas',
  rejected: 'Ditolak',
  expired: 'Kedaluarsa',
  failed: 'Gagal',
  none: '—',
}
```

And title map: `title === 'Panic Alert'` → display 'Laporan Darurat' (inline conditional at the title render site, lines ~82 — read exact lines first).

- [ ] **Step 3: Verify with build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 4: Format and commit**

```bash
npm run format
git add src/features/siwarga-dashboard/security-widgets.tsx src/features/siwarga-dashboard/index.tsx src/features/siwarga-notifications/notifications-page.tsx
git commit -m "feat: add security dashboard widgets and Bahasa labels"
```

---

### Task 3: payment safety backend (bill lock, Xendit auth, channels)

**Files:**
- Modify: `app/Services/PaymentTransactionService.php`
- Modify: `app/Payments/XenditProvider.php`
- Modify: `app/Http/Controllers/Api/PaymentTransactionController.php`
- Test: extend `tests/Feature/Api/PaymentTransactionTest.php` (append new tests, do NOT rewrite existing)

**Interfaces:**
- Consumes: `PaymentService::create` (existing overpay guard — read it first to confirm behavior on lunas bills), `Bill::lockForUpdate`.
- Produces: hardened `finalizePaid` + explicit channel contract consumed by Task 5 e2e (reject-path).

- [ ] **Step 1: Xendit docs lookup (web) — auth scheme verdict FIRST**

Use web search/fetch on Xendit API docs (QR Codes + Callback Virtual Accounts): does authentication use HTTP Basic (`api_key:`) or Bearer? Record the verdict (URL + scheme) in the report. If Basic confirmed → Step 3a. If inconclusive → skip 3a, note "parked, simulator-only launch" in report, and say so in the final message.

- [ ] **Step 2: Write the failing tests (append to PaymentTransactionTest)**

```php
    public function test_concurrent_settle_yields_exactly_one_payment()
    {
        $first = PaymentTransaction::factory()->create([
            'bill_id' => $this->bill->id,
            'user_id' => $this->warga->id,
            'status' => 'pending',
            'provider' => 'simulator',
        ]);
        $second = PaymentTransaction::factory()->create([
            'bill_id' => $this->bill->id,
            'user_id' => $this->warga->id,
            'status' => 'pending',
            'provider' => 'simulator',
        ]);

        // Sequential simulation of the race: first wins, second must 422.
        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$first->id}/simulate-pay")
            ->assertStatus(200)->assertJsonPath('data.status', 'paid');
        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$second->id}/simulate-pay")
            ->assertStatus(422);

        $this->assertEquals(1, Payment::where('bill_id', $this->bill->id)->count());
        $this->assertEquals('lunas', $this->bill->fresh()->status);
    }

    public function test_unknown_channel_is_rejected()
    {
        $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'ewallet',
        ])->assertStatus(422);
    }
```

Note: check the test file's existing `setUp` (property names `$this->bill`, `$this->warga` — verify exact names first and adapt; do NOT assume).

- [ ] **Step 3: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/PaymentTransactionTest.php`
Expected: FAIL — second settle currently succeeds (double Payment), ewallet currently falls through to VA.

- [ ] **Step 4: Harden `finalizePaid` (bill lock + verified_by/at inside)**

In `finalizePaid()`, after locking the transaction row: add `Bill::whereKey($fresh->bill_id)->lockForUpdate()->firstOrFail()` (import `App\Models\Bill`), then `abort_if($bill->status === 'lunas', 422, 'Tagihan ini sudah lunas.')` — use `ValidationException::withMessages(['bill_id' => ['Tagihan ini sudah lunas.']])` to match codebase style (check current file's idiom first). Move the `verified_by/at` write (currently in `verify()` before calling finalize) INTO `finalizePaid`: change signature to `finalizePaid(PaymentTransaction $transaction, string $actorName, ?User $verifier = null)` and set `verified_by/at` inside the tx when `$verifier` given; update `verify()` to pass `$actor` instead of pre-writing. Keep the paid-replay no-op FIRST (before the bill lock — no, AFTER? Order: lock trx → paid no-op → lock bill → lunas check → verifier write → PaymentService::create → status paid. Paid no-op before bill lock avoids pointless bill locks on replays.)

- [ ] **Step 5: Channel mapping + controller rule + Xendit auth (if confirmed)**

`XenditProvider::createInvoice`: top guard — `if (! in_array($transaction->channel, ['qris', 'va'], true)) throw ValidationException::withMessages(['channel' => ['Kanal belum didukung provider ini.']])`; keep qris→QR, va→VA branches. Controller `store` validation: add `'bank_code' => ['required_if:channel,va', 'nullable', 'string', 'max:20']` and pass through to the VA branch (XenditProvider reads `$transaction->...`? The provider builds from the transaction row — bank_code isn't a column. Simplest: validate + ignore persistence (document), OR stash into `pay_code`? NO — do NOT misuse columns. Decision: validate `bank_code` at controller (required_if va) and pass via a transient: set `$transaction->setAttribute('bank_code', ...)`? Eloquent transient attributes work in-memory for the provider call within the same request. Implement: in `createOnline`, after create, `$transaction->bank_code = $data['bank_code'] ?? null` (non-fillable transient — but `create()` with array would fail on... no, fillable guards only `create/fill`; direct assignment always works and never persists unless saved). Provider reads `$transaction->bank_code ?? 'BRI'`. Hmm — that reintroduces a default. Per spec fix: NO silent default — controller requires bank_code for va, provider uses `$transaction->bank_code` (assert present, 422 if missing as defense-in-depth).

Xendit auth (ONLY if Step 1 confirmed Basic): replace both `Http::withToken(...)` with `Http::withBasicAuth((string) config('services.xendit.secret_key'), '')` + add test with `Http::fake` asserting `Authorization: Basic ...` header on invoice creation. If not confirmed: skip, report parked.

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/PaymentTransactionTest.php`
Expected: PASS (existing + 2 new).

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/PaymentTransactionService.php app/Payments/XenditProvider.php app/Http/Controllers/Api/PaymentTransactionController.php tests/Feature/Api/PaymentTransactionTest.php
git commit -m "fix: harden payment settlement with bill lock and explicit channels"
```

---

### Task 4: validation & infra sweep (backend + SW + minors)

**Files:**
- Modify: `app/Http/Controllers/Api/FamilyMemberController.php` (NIK rule)
- Modify: `app/Http/Controllers/Api/ExportController.php` (clamp + log-after)
- Modify: `app/Http/Controllers/Api/PaymentTransactionController.php` (proof cleanup)
- Create: `database/migrations/2026_09_10_000007_add_guest_logs_registrar_status_index.php`
- Modify: `public/sw.js` (guards)
- Modify: `src/types/api.ts` (notif type)
- Modify: `src/services/exports.ts` (Safari download)
- Modify: `src/features/siwarga-family/family-page.tsx` (NIK pattern)
- Modify: `src/features/siwarga-exports/exports-page.tsx` (disable invalid)
- Test: extend `tests/Feature/Api/FamilyMemberTest.php` + `tests/Feature/Api/ExportTest.php` (append, don't rewrite)

**Interfaces:**
- Consumes: existing validation idioms. Produces: hardened inputs consumed by Task 5 e2e (NIK rejection).

- [ ] **Step 1: Write the failing tests (append)**

FamilyMemberTest:

```php
    public function test_nik_must_be_16_digits_when_present()
    {
        $this->actingAs($this->warga)->postJson('/api/family-members', [
            'name' => 'Anak',
            'relationship' => 'anak',
            'nik' => '12345',
        ])->assertStatus(422);

        $this->actingAs($this->warga)->postJson('/api/family-members', [
            'name' => 'Anak',
            'relationship' => 'anak',
        ])->assertStatus(201);
    }
```

(Verify setUp property names first — `$this->warga` assumed; adapt.)

ExportTest:

```php
    public function test_export_rejects_invalid_year()
    {
        $this->actingAs($this->admin)->get('/api/reports/monthly/1999/1/pdf')
            ->assertStatus(422);
    }
```

(Check current monthlyPdf validation — if year unvalidated today, this fails pre-fix as required. Adapt year bounds to the implemented rule `>= 2020`.)

- [ ] **Step 2: Run to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/ExportTest.php`
Expected: FAIL on the new tests.

- [ ] **Step 3: Backend changes**

  a. FamilyMemberController `validateMember`: `'nik' => [$sometimesRule, 'nullable', 'string', 'regex:/^[0-9]{16}$/']` (message will be English-default; add custom message `'nik.regex' => 'NIK harus 16 digit angka.'` via the third arg of `validate()`? `$request->validate($rules, $messages)` — add messages array with that key. Check file's current validate call shape first.)
  b. ExportController: `monthlyPdf/summaryPdf` validate `year >= 2020` (422), `month 1-12` (keep); `dataset()`: clamp `per_page` to max 100 (`min((int) $request->per_page ?? 10, 100)` — check current per_page handling first); move the three `ActivityLog::create` calls to AFTER successful generation (generate into variable → log → return).
  c. PaymentTransactionController `proof()`: delete the first (dead) `abort_unless` block (lines ~85-90), keep owner-only check + one-line comment `// Hanya pembayar yang boleh mengunggah bukti.`

- [ ] **Step 4: Migration + SW + frontend minors**

  a. Migration `2026_09_10_000007_add_guest_logs_registrar_status_index.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guest_logs', function (Blueprint $table) {
            $table->index(['registered_by', 'status'], 'guest_logs_registrar_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_logs_registrar_status');
    }
};
```

Wait — `dropIfExists` drops a TABLE, not an index. Correct `down()`: `Schema::table('guest_logs', fn (Blueprint $t) => $t->dropIndex('guest_logs_registrar_status'));`. Implementer: use the correct form (this note overrides the snippet above).

  b. `sw.js` runtime handler: add `if (event.request.method !== 'GET') return;` at fetch top (after /api/ check), and only `cache.put` when `res.ok && new URL(event.request.url).origin === self.location.origin`; add `.catch(() => caches.match(event.request))`? Keep navigate fallback as-is; for non-navigate runtime failures return the error (don't cache). Minimal diff preserving structure.
  c. `api.ts` notification type: loosen to `ticket_id?: number; transaction_id?: number; amount?: number` (find exact interface first — `AppNotification.data` shape).
  d. `exports.ts downloadBlob`: append anchor, click, remove, `setTimeout(() => URL.revokeObjectURL(url), 1000)`.
  e. `family-page.tsx` NIK input: add `pattern='[0-9]{16}'` + `maxLength={16}` + title 'NIK harus 16 digit angka' (client hint only; server enforces).
  f. `exports-page.tsx`: disable download buttons when month/year invalid (`month < 1 || month > 12 || year < 2020 || !Number.isInteger`), keep generic toast as fallback.

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/ExportTest.php` + `php artisan migrate` (index applies cleanly)
Expected: PASS.

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/FamilyMemberController.php app/Http/Controllers/Api/ExportController.php app/Http/Controllers/Api/PaymentTransactionController.php database/migrations/2026_09_10_000007_add_guest_logs_registrar_status_index.php public/sw.js src/types/api.ts src/services/exports.ts src/features/siwarga-family/family-page.tsx src/features/siwarga-exports/exports-page.tsx tests/Feature/Api/FamilyMemberTest.php tests/Feature/Api/ExportTest.php
git commit -m "fix: harden validation, logging order, SW caching, and downloads"
```

---

### Task 5: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-6-hardening.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–4. Helpers: `test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL`.
- Produces: 4 green e2e flows; full-suite verification evidence.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL } from './setup'

test.describe('Hardening backlog', () => {
  test('QR scan lands on VALID verify page; bad token invalid', async ({ page, request }) => {
    const adminToken = await apiToken(defaultAdmin.email, defaultAdmin.password)
    // per-test warga WITH house (panic-test pattern): create user + resident + house link via API,
    // create family member, GET /api/households/card as that user → verify_token
    // page.goto(`/verifikasi-keluarga/${token}`) → expect TER VERIFIKASI + head name
    // page.goto('/verifikasi-keluarga/999.invalid') → expect 'tidak valid'
  })

  test('admin manages emergency contacts', async ({ page }) => {
    // login as defaultAdmin: /emergency-contacts → add contact (uid name) → visible;
    // edit phone → visible; delete → gone. All via mandated UI (no apiPost shortcuts for the actions).
  })

  test('dashboard widgets render per role', async ({ page }) => {
    // admin/satpam login → Panic Aktif + Tamu Hari Ini cards visible;
    // warga login → Lapor Darurat shortcut visible.
    // NOTE: widget titles are implementer-chosen in Task 2 — read the committed
    // security-widgets.tsx FIRST and assert its actual headings (brief allowance:
    // adapt selectors to UI, never rename UI).
  })

  test('short NIK rejected in family form', async ({ page }) => {
    // per-test warga login: /family → Tambah Anggota → NIK '12345' → Simpan Anggota
    // → expect 422 surfaced (error toast or field error — read family-page.tsx
    // error display FIRST, then assert accordingly).
  })
})
```

Expand following `fase-5-convenience.spec.ts` (per-test users, uid names, no sleeps, API-state asserts). For test 3/4 the mandated names from earlier tasks still hold (`Tambah Anggota`, `Simpan Anggota`).

- [ ] **Step 2: Start servers, run the new spec**

Backend `:8000` + dev `:5173` (+ preview only if asserting SW — not needed here; skip preview). `npx playwright install chromium` if needed else BLOCKED.

Run: `npx playwright test e2e/siwarga/fase-6-hardening.spec.ts`
Expected: 4/4 PASS.

- [ ] **Step 3: Full verification**

`composer test`, `npm run build`, `npm run test`, full `npx playwright test` (fresh-DB caveat known: demo seeders commented out → run on the CURRENT dev DB state like Fase 5 did, or re-seed to match; document choice). Triage pre-existing with file evidence; fix only this-plan breakage in owning files under TDD.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/e2e/siwarga/fase-6-hardening.spec.ts
git commit -m "test: add hardening e2e (verify page, contacts, widgets, NIK)"
```

---

## Self-Review

**1. Spec coverage:** §2.1 verify page → Task 1 ✓ (no backend change — endpoint exists); §2.2 contacts UI → Task 1 ✓; §3 widgets → Task 2 ✓; §3 labels → Task 2 ✓; §4.1 lock → Task 3 ✓ (+test); §4.2 Xendit → Task 3 ✓ (lookup-first, conditional); §4.3 channels → Task 3 ✓ (no silent default — bank_code required_if va); §5 NIK → Task 4 ✓ (both sides); §5 clamp → Task 4 ✓; §5 proof cleanup → Task 4 ✓; §5 index → Task 4 ✓; §5 SW → Task 4 ✓; §5 log-after → Task 4 ✓; §5 TS/download → Task 4 ✓; §6 tests → Tasks 3–5 ✓.

**2. Placeholder scan:** no TBD/TODO/"similar to". Delegations are concrete (read exact lines/shapes first, named files). Migration `down()` trap explicitly corrected inline.

**3. Type consistency:** hook names (`useEmergencyContacts`, `usePanicAlerts`, `useGuestLogs`, `usePatrols`) match existing files; `EmergencyContact` type exists (Fase 4); STATUS_LABELS extension preserves existing keys; `finalizePaid` signature change traced to both callers (`verify`, webhook path via `handleWebhook` — implementer must update ALL callers; `simulatePay` too).
