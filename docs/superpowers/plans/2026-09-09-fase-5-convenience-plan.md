# Fase 5 Convenience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build generic online payment (pluggable providers: Xendit + Simulator now, documented slots for more) plus manual transfer with proof verification, PDF/Excel/JSON export & backup, and minimal installable PWA — backend API + React UI + tests.

**Architecture:** Payment core (`PaymentTransactionService` + `PaymentProvider` contract + registry) isolates provider specifics behind `createInvoice/parseWebhook/verifySignature`; both online success and manual approval funnel into one `finalizePaid()` that reuses `PaymentService::create` (bill `lunas` logic untouched). Export reuses `ReportService` arrays into DomPDF views / Excel exports. PWA is vanilla (`manifest` + hand-written `sw.js`, no build plugin).

**Tech Stack:** Laravel 13, PHPUnit, MySQL, React 19 + TanStack Query/Router, `barryvdh/laravel-dompdf` + `maatwebsite/excel` (new composer deps — need user approval), existing `PaymentService`, `WahaService` NOT needed here (DB notifications only).

**Spec:** `docs/superpowers/specs/2026-09-09-fase-5-convenience-design.md` (all sections approved by user).

## Global Constraints

- Follow Pint formatting (`vendor/bin/pint --dirty --format agent`) before each PHP commit.
- Every change must be programmatically tested (TDD: failing test first, then minimal implementation).
- Webhook rule: verify provider signature FIRST (wrong → 403, no DB touch), then idempotency check (already-paid reference → 200 no-op, exactly one `Payment` row ever per transaction).
- WA dispatch is NOT used in this phase — DB notifications only (reuse generic `title`/`old_status`/`new_status` keys so the Fase 2 bell renders them).
- Never assert real network calls — `Http::fake()` Xendit HTTP in tests; e2e uses the `simulator` provider only.
- NIK is irrelevant here, but backup JSON MUST exclude `users.password` (hashes) — strip explicitly.
- Frontend toasts in Bahasa Indonesia; reuse `DataTable*` primitives, `use-table-url-state`, `Header`/`Main` layout, `useHasPermission`, tickets page pattern.
- No MSW handlers exist for payments-online/exports — none to update.
- NEW COMPOSER DEPS (need user approval at execution): `barryvdh/laravel-dompdf`, `maatwebsite/excel` (both MIT). If declined, Task 3 becomes text/CSV fallback — ask before substituting.
- PWA installability DoD: manifest linked + SW registered (e2e-asserted); full Lighthouse pass is best-effort.

---

## File map

| File | Responsibility |
|---|---|
| `app/Models/Permission.php` | +2 permissions (`payments.online`, `payments.verify`) |
| `app/Models/PaymentTransaction.php` (new) | transaction model + relations + status constants |
| `app/Payments/PaymentProvider.php`, `ProviderInvoice.php`, `ProviderWebhook.php`, `PaymentProviderRegistry.php` (new) | generic contract, DTOs, config-based resolution |
| `app/Payments/XenditProvider.php`, `SimulatorProvider.php`, `MidtransProvider.php` (new) | Xendit QRIS+VA, dev simulator, documented stub |
| `app/Services/PaymentTransactionService.php` (new) | create/verify/webhook/finalizePaid + proof handling |
| `app/Http/Controllers/Api/PaymentTransactionController.php`, `PaymentWebhookController.php` (new) | endpoints |
| `app/Http/Resources/PaymentTransactionResource.php` (new) | resource |
| `app/Notifications/PaymentSettled.php` (new) | DB payload (title/old_status/new_status) |
| `config/services.php`, `.env.example` | `services.xendit` keys + `PAYMENT_PROVIDER` |
| `database/migrations/2026_09_10_000006_create_payment_transactions_table.php` (new) | transactions table |
| `app/Services/ReportPdfService.php`, `resources/views/reports/*.blade.php` (new) | DomPDF rendering |
| `app/Exports/*Export.php` (new ×5), `app/Services/BackupService.php` (new) | Excel exports + JSON backup |
| `app/Http/Controllers/Api/ExportController.php` (new) | pdf/xlsx/backup endpoints |
| `routes/api.php`, `app/Providers/AppServiceProvider.php`, `database/seeders/RoleSeeder.php` | routes, gates, `exports`+`webhooks` limiters, seed deltas |
| `src/types/api.ts` | payment/export TS types |
| `src/services/payments-online.ts`, `exports.ts` (new) | thin axios clients |
| `src/hooks/use-payments-online.ts`, `use-exports.ts` (new) | TanStack Query hooks |
| `src/features/siwarga-payments-online/*`, `siwarga-exports/*` (new) | pages |
| `src/routes/_authenticated/payments-online/index.tsx`, `exports/index.tsx` (new) | routes + zod schemas |
| `src/components/layout/data/sidebar-data.ts` | menu entries |
| `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html`, `public/images/icon-*.png` (new) | PWA assets |
| `index.html`, `src/main.tsx` | manifest link + SW registration |

---

### Task 1: payment permissions/policies/gates/seeder + transaction model + provider contract

**Files:**
- Modify: `app/Models/Permission.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `database/seeders/RoleSeeder.php`
- Create: `app/Models/PaymentTransaction.php`
- Create: `app/Payments/PaymentProvider.php`
- Create: `app/Payments/ProviderInvoice.php`
- Create: `app/Payments/ProviderWebhook.php`
- Create: `app/Payments/PaymentProviderRegistry.php`
- Create: `app/Payments/SimulatorProvider.php`
- Create: `app/Payments/XenditProvider.php`
- Create: `app/Payments/MidtransProvider.php`
- Create: `app/Policies/PaymentTransactionPolicy.php`
- Create: `database/factories/PaymentTransactionFactory.php`
- Modify: `config/services.php`
- Modify: `.env.example`
- Test: `tests/Unit/PaymentProviderTest.php`

**Interfaces:**
- Consumes: `User::hasPermission()`, `Permission::SYSTEM_PERMISSIONS`, seeders.
- Produces: gates `payments.online`, `payments.verify`; `PaymentTransaction` model (consumed Tasks 2–4, 6); `PaymentProvider::{key,createInvoice,parseWebhook,verifySignature}`, `PaymentProviderRegistry::for(string): PaymentProvider`, `SimulatorProvider` + `XenditProvider` (consumed Task 2); `MidtransProvider` stub documents the add-provider recipe.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\PaymentTransaction;
use App\Models\Role;
use App\Models\User;
use App\Payments\MidtransProvider;
use App\Payments\PaymentProviderRegistry;
use App\Payments\SimulatorProvider;
use App\Payments\XenditProvider;
use App\Policies\PaymentTransactionPolicy;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class PaymentProviderTest extends TestCase
{
    use RefreshDatabase;

    public function test_registry_resolves_configured_provider()
    {
        config()->set('services.payments.provider', 'simulator');

        $this->assertInstanceOf(SimulatorProvider::class, PaymentProviderRegistry::for('simulator'));
        $this->assertInstanceOf(XenditProvider::class, PaymentProviderRegistry::for('xendit'));
    }

    public function test_registry_rejects_unknown_provider()
    {
        $this->expectException(\InvalidArgumentException::class);

        PaymentProviderRegistry::for('nope');
    }

    public function test_simulator_creates_and_parses_invoice()
    {
        $trx = PaymentTransaction::factory()->make(['id' => 7, 'amount' => 50000]);
        $invoice = (new SimulatorProvider)->createInvoice($trx);

        $this->assertStringStartsWith('SIM-', $invoice->reference);
        $this->assertNotEmpty($invoice->qrPayload);

        $request = Request::create('/', 'POST', ['reference' => $invoice->reference, 'status' => 'paid']);
        $webhook = (new SimulatorProvider)->parseWebhook($request);

        $this->assertSame('paid', $webhook->status);
        $this->assertTrue((new SimulatorProvider)->verifySignature($request));
    }

    public function test_xendit_rejects_bad_callback_token()
    {
        config()->set('services.xendit.callback_token', 'secret');

        $request = Request::create('/', 'POST', [], [], [], ['HTTP_X_CALLBACK_TOKEN' => 'wrong']);

        $this->assertFalse((new XenditProvider)->verifySignature($request));
    }

    public function test_midtrans_stub_documents_recipe()
    {
        try {
            (new MidtransProvider)->createInvoice(PaymentTransaction::factory()->make());
            $this->fail('stub must throw');
        } catch (\LogicException $exception) {
            $this->assertStringContainsString('MidtransProvider', $exception->getMessage());
        }
    }

    public function test_policy_warga_online_own_bendahara_verify()
    {
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
        $warga = User::factory()->create();
        $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $warga->load('roles.permissions');
        $bendahara = User::factory()->create();
        $bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $bendahara->load('roles.permissions');

        $this->assertTrue((new PaymentTransactionPolicy)->create($warga));
        $this->assertFalse((new PaymentTransactionPolicy)->verify($warga, new PaymentTransaction));
        $this->assertTrue((new PaymentTransactionPolicy)->verify($bendahara, new PaymentTransaction));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/PaymentProviderTest.php`
Expected: FAIL — `App\Payments\*` classes not found.

- [ ] **Step 3: Add permissions**

In `app/Models/Permission.php`, after the `'payments.trash'` line:

```php
        'payments.trash' => 'Kelola data pembayaran terhapus',
        'payments.online' => 'Bayar tagihan secara online',
        'payments.verify' => 'Verifikasi bukti pembayaran manual',
```

- [ ] **Step 4: Write the model + factory**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PaymentTransaction extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_PENDING = 'pending';

    public const STATUS_AWAITING_VERIFICATION = 'awaiting_verification';

    public const STATUS_PAID = 'paid';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'bill_id', 'user_id', 'provider', 'channel', 'amount',
        'status', 'reference', 'idempotency_key', 'pay_code',
        'expires_at', 'proof_path', 'verified_by', 'verified_at',
        'rejection_reason', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class)->withTrashed();
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
```

Factory: bill_id → Bill::factory(), user_id → User::factory(), provider → 'simulator', channel → 'qris', amount → 75000, status → pending, reference → `'SIM-'.Str::upper(Str::random(10))`, idempotency_key → `Str::uuid()`, pay_code → null, expires_at → now()->addMinutes(30), rest null.

- [ ] **Step 5: Write the provider contract + implementations**

```php
<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;

interface PaymentProvider
{
    public function key(): string;

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice;

    public function parseWebhook(Request $request): ProviderWebhook;

    public function verifySignature(Request $request): bool;
}
```

```php
<?php

namespace App\Payments;

class ProviderInvoice
{
    public function __construct(
        public string $reference,
        public ?string $payCode = null,
        public ?string $qrPayload = null,
        public ?\DateTimeInterface $expiresAt = null,
    ) {}
}
```

```php
<?php

namespace App\Payments;

class ProviderWebhook
{
    public function __construct(
        public string $reference,
        public string $status,
        public array $raw = [],
    ) {}
}
```

```php
<?php

namespace App\Payments;

class PaymentProviderRegistry
{
    /**
     * @return array<string, class-string<PaymentProvider>>
     */
    public static function map(): array
    {
        return [
            'simulator' => SimulatorProvider::class,
            'xendit' => XenditProvider::class,
            'midtrans' => MidtransProvider::class,
        ];
    }

    public static function for(?string $key = null): PaymentProvider
    {
        $key ??= (string) config('services.payments.provider', 'simulator');
        $map = self::map();

        if (! isset($map[$key])) {
            throw new \InvalidArgumentException("Unknown payment provider [{$key}].");
        }

        return app($map[$key]);
    }
}
```

```php
<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SimulatorProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'simulator';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        return new ProviderInvoice(
            reference: 'SIM-'.Str::upper(Str::random(10)),
            payCode: 'SIMULATOR-'.$transaction->id,
            qrPayload: 'SIMULATOR:'.$transaction->id.':'.$transaction->amount,
            expiresAt: now()->addMinutes(30),
        );
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        return new ProviderWebhook(
            reference: (string) $request->input('reference'),
            status: (string) $request->input('status', 'paid'),
            raw: $request->all(),
        );
    }

    public function verifySignature(Request $request): bool
    {
        return true;
    }
}
```

```php
<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class XenditProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'xendit';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        $base = rtrim((string) config('services.xendit.base_url', 'https://api.xendit.co'), '/');

        $payload = [
            'external_id' => $transaction->idempotency_key,
            'amount' => (float) $transaction->amount,
            'description' => "SIWarga tagihan #{$transaction->bill_id}",
        ];

        if ($transaction->channel === 'qris') {
            $response = Http::withToken((string) config('services.xendit.secret_key'))
                ->post("{$base}/qr_codes", [
                    'external_id' => $transaction->idempotency_key,
                    'type' => 'DYNAMIC',
                    'callback_url' => route('payments.webhook', ['provider' => 'xendit']),
                    'amount' => (float) $transaction->amount,
                ])->throw()->json();

            return new ProviderInvoice(
                reference: (string) ($response['id'] ?? $transaction->idempotency_key),
                qrPayload: (string) ($response['qr_string'] ?? ''),
                expiresAt: isset($response['expires_at']) ? new \DateTimeImmutable($response['expires_at']) : now()->addMinutes(30),
            );
        }

        $response = Http::withToken((string) config('services.xendit.secret_key'))
            ->post("{$base}/callback_virtual_accounts", [
                'external_id' => $transaction->idempotency_key,
                'bank_code' => 'BRI',
                'name' => 'SIWarga',
                ...$payload,
            ])->throw()->json();

        return new ProviderInvoice(
            reference: (string) ($response['id'] ?? $transaction->idempotency_key),
            payCode: (string) ($response['account_number'] ?? ''),
            expiresAt: isset($response['expiration_date']) ? new \DateTimeImmutable($response['expiration_date']) : now()->addHours(24),
        );
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        $status = strtolower((string) $request->input('status', ''));

        return new ProviderWebhook(
            reference: (string) ($request->input('qr_code_id', $request->input('callback_virtual_account_id', $request->input('external_id')))),
            status: in_array($status, ['paid', 'completed', 'success'], true) ? 'paid' : $status,
            raw: $request->all(),
        );
    }

    public function verifySignature(Request $request): bool
    {
        $expected = (string) config('services.xendit.callback_token');

        return $expected !== '' && hash_equals($expected, (string) $request->header('x-callback-token'));
    }
}
```

```php
<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;

/**
 * Recipe slot for the next provider (Duitku/Doku/PayPal follow the same shape):
 * 1. Implement createInvoice() against the provider HTTP API.
 * 2. Implement parseWebhook() mapping their payload to reference+status.
 * 3. Implement verifySignature() with their signing scheme.
 * 4. Register key => class in PaymentProviderRegistry::map().
 */
class MidtransProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'midtrans';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }

    public function verifySignature(Request $request): bool
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }
}
```

```php
<?php

namespace App\Policies;

use App\Models\PaymentTransaction;
use App\Models\User;

class PaymentTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('payments.online');
    }

    public function view(User $user, PaymentTransaction $transaction): bool
    {
        if ($user->hasPermission('payments.view.all')) {
            return true;
        }

        return $user->hasPermission('payments.online') && $transaction->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('payments.online');
    }

    public function verify(User $user, PaymentTransaction $transaction): bool
    {
        return $user->hasPermission('payments.verify');
    }
}
```

- [ ] **Step 6: Config + env + gates + seeder**

`config/services.php` — append inside the returned array (check exact tail first; add):

```php
    'payments' => [
        'provider' => env('PAYMENT_PROVIDER', 'simulator'),
    ],

    'xendit' => [
        'secret_key' => env('XENDIT_SECRET_KEY'),
        'callback_token' => env('XENDIT_CALLBACK_TOKEN'),
        'base_url' => env('XENDIT_BASE_URL', 'https://api.xendit.co'),
    ],
```

`.env.example` — append:

```
PAYMENT_PROVIDER=simulator
XENDIT_SECRET_KEY=
XENDIT_CALLBACK_TOKEN=
XENDIT_BASE_URL=https://api.xendit.co
```

Gates in `AppServiceProvider` after the payments lines (find the existing payments gate block first and match style):

```php
        Gate::define('payments.online', [PaymentTransactionPolicy::class, 'create']);
        Gate::define('payments.verify', fn (User $user) => $user->hasPermission('payments.verify'));
```

`RoleSeeder`: warga list gains `'payments.online',`; bendahara list gains `'payments.verify',`. Admin auto-syncs all.

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/PaymentProviderTest.php`
Expected: PASS (6 tests). Note: `PaymentTransaction::factory()->make()` is in-memory; migration arrives Task 2.

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Permission.php app/Providers/AppServiceProvider.php database/seeders/RoleSeeder.php app/Models/PaymentTransaction.php app/Payments/ database/factories/PaymentTransactionFactory.php app/Policies/PaymentTransactionPolicy.php config/services.php .env.example tests/Unit/PaymentProviderTest.php
git commit -m "feat: add generic payment provider contract with Xendit and simulator"
```

---

### Task 2: payment transactions backend (create/verify/webhook/finalize)

**Files:**
- Create: `database/migrations/2026_09_10_000006_create_payment_transactions_table.php`
- Create: `app/Services/PaymentTransactionService.php`
- Create: `app/Http/Controllers/Api/PaymentTransactionController.php`
- Create: `app/Http/Controllers/Api/PaymentWebhookController.php`
- Create: `app/Http/Resources/PaymentTransactionResource.php`
- Create: `app/Notifications/PaymentSettled.php`
- Modify: `routes/api.php`
- Modify: `app/Providers/AppServiceProvider.php` (`webhooks` limiter)
- Test: `tests/Feature/Api/PaymentTransactionTest.php`

**Interfaces:**
- Consumes: `PaymentProviderRegistry`, `PaymentService::create(array, int): Payment` (existing — asserts within remaining + refreshes bill to `lunas`), `Bill` (resident scoping like BillController: `view.all` or own resident), `PaymentTransactionPolicy` (Task 1).
- Produces: `PaymentTransactionService::{createOnline(Bill, array, User), uploadProof(PaymentTransaction, UploadedFile, User), verify(PaymentTransaction, bool, ?string, User), handleWebhook(string, Request): PaymentTransaction, simulatePay(PaymentTransaction, User)}`; routes `GET/POST /api/payment-transactions`, `GET /api/payment-transactions/{paymentTransaction}`, `POST .../{paymentTransaction}/proof`, `POST .../{paymentTransaction}/verify`, `POST .../{paymentTransaction}/simulate-pay`, `POST /api/public/payments/webhook/{provider}` (named `payments.webhook`).

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Jobs\SendPanicWhatsappJob; // placeholder — DELETE this line, no jobs in this phase
use App\Models\Bill;
use App\Models\DueType;
use App\Models\House;
use App\Models\Payment;
use App\Models\PaymentTransaction;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected User $warga;

    protected User $bendahara;

    protected Bill $bill;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.payments.provider', 'simulator');
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);

        $this->warga = User::factory()->create(['resident_id' => $resident->id]);
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');

        $this->bendahara = User::factory()->create();
        $this->bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);
        $this->bendahara->load('roles.permissions');

        $dueType = DueType::factory()->create();
        $this->bill = Bill::factory()->create([
            'house_id' => $house->id,
            'resident_id' => $resident->id,
            'due_type_id' => $dueType->id,
            'amount_due' => 50000,
            'status' => 'belum_lunas',
        ]);
    }

    public function test_warga_creates_simulator_qris_transaction()
    {
        $response = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'qris',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonStructure(['data' => ['pay_code', 'qr_payload']]);
    }

    public function test_simulate_pay_settles_bill_exactly_once()
    {
        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'qris',
        ])->json('data');

        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$created['id']}/simulate-pay")
            ->assertStatus(200)->assertJsonPath('data.status', 'paid');

        // Replay is a no-op: still exactly one Payment row.
        $this->postJson('/api/public/payments/webhook/simulator', [
            'reference' => $created['reference'],
            'status' => 'paid',
        ])->assertStatus(200);

        $this->assertEquals(1, Payment::where('bill_id', $this->bill->id)->count());
        $this->assertEquals('lunas', $this->bill->fresh()->status);
    }

    public function test_manual_proof_verify_flow()
    {
        Storage::fake('public');

        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'manual_transfer',
            'proof' => UploadedFile::fake()->image('bukti.jpg'),
        ])->assertStatus(201)->assertJsonPath('data.status', 'awaiting_verification')->json('data');

        Storage::disk('public')->assertExists($created['proof_path']);

        $this->actingAs($this->bendahara)->postJson("/api/payment-transactions/{$created['id']}/verify", [
            'approve' => true,
        ])->assertStatus(200)->assertJsonPath('data.status', 'paid');

        $this->assertEquals('lunas', $this->bill->fresh()->status);
    }

    public function test_verify_reject_notifies_and_keeps_bill_open()
    {
        Storage::fake('public');

        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'manual_transfer',
            'proof' => UploadedFile::fake()->image('bukti.jpg'),
        ])->json('data');

        $this->actingAs($this->bendahara)->postJson("/api/payment-transactions/{$created['id']}/verify", [
            'approve' => false,
            'reason' => 'Bukti tidak jelas',
        ])->assertStatus(200)->assertJsonPath('data.status', 'rejected');

        $this->assertEquals('belum_lunas', $this->bill->fresh()->status);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $this->warga->id]);
    }

    public function test_webhook_wrong_provider_is_rejected()
    {
        $this->postJson('/api/public/payments/webhook/nope', [])->assertStatus(404);
    }

    public function test_warga_cannot_pay_others_bill_or_verify()
    {
        $other = Bill::factory()->create(['status' => 'belum_lunas', 'amount_due' => 10000]);

        $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $other->id,
            'channel' => 'qris',
        ])->assertStatus(403);

        $trx = PaymentTransaction::factory()->create(['bill_id' => $this->bill->id, 'user_id' => $this->warga->id]);

        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$trx->id}/verify", ['approve' => true])
            ->assertStatus(403);
    }
}
```

IMPORTANT: delete the `use App\Jobs\SendPanicWhatsappJob;` placeholder line before saving — no jobs exist in this phase.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/PaymentTransactionTest.php`
Expected: FAIL — table `payment_transactions` doesn't exist.

- [ ] **Step 3: Write the migration and run it**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained('bills');
            $table->foreignId('user_id')->constrained('users');
            $table->string('provider', 30);
            $table->string('channel', 30);
            $table->decimal('amount', 12, 2);
            $table->string('status', 30)->default('pending');
            $table->string('reference', 100)->unique();
            $table->string('idempotency_key', 100)->unique();
            $table->string('pay_code', 255)->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->string('proof_path', 255)->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users');
            $table->dateTime('verified_at')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'status'], 'payment_trx_user_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
```

Save as `database/migrations/2026_09_10_000006_create_payment_transactions_table.php`, run `php artisan migrate`.

- [ ] **Step 4: Write the notification + service**

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentSettled extends Notification
{
    use Queueable;

    public function __construct(
        public int $transactionId,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
        public float $amount,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return [
            'transaction_id' => $this->transactionId,
            'title' => 'Pembayaran Tagihan',
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
            'amount' => $this->amount,
        ];
    }
}
```

```php
<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Notifications\PaymentSettled;
use App\Payments\PaymentProviderRegistry;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentTransactionService
{
    public function __construct(
        private PaymentService $paymentService,
        private HtmlSanitizer $htmlSanitizer,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createOnline(Bill $bill, array $data, User $user): PaymentTransaction
    {
        if ($bill->status === 'lunas') {
            throw ValidationException::withMessages(['bill_id' => ['Tagihan ini sudah lunas.']]);
        }

        $providerKey = $data['provider'] ?? (string) config('services.payments.provider', 'simulator');
        $provider = PaymentProviderRegistry::for($providerKey);

        $transaction = PaymentTransaction::create([
            'bill_id' => $bill->id,
            'user_id' => $user->id,
            'provider' => $provider->key(),
            'channel' => $data['channel'],
            'amount' => $bill->amount_due,
            'status' => PaymentTransaction::STATUS_PENDING,
            'reference' => 'TMP-'.Str::upper(Str::random(10)),
            'idempotency_key' => (string) Str::uuid(),
        ]);

        $invoice = $provider->createInvoice($transaction->fresh());

        $transaction->update([
            'reference' => $invoice->reference,
            'pay_code' => $invoice->payCode ?? $invoice->qrPayload,
            'expires_at' => $invoice->expiresAt,
        ]);

        return $transaction->fresh(['bill', 'payer']);
    }

    public function uploadProof(PaymentTransaction $transaction, UploadedFile $file, User $user): PaymentTransaction
    {
        if (! in_array($transaction->status, [PaymentTransaction::STATUS_PENDING], true)) {
            throw ValidationException::withMessages(['status' => ['Transaksi ini tidak bisa dilengkapi bukti.']]);
        }

        if ($transaction->proof_path !== null) {
            Storage::disk('public')->delete($transaction->proof_path);
        }

        $transaction->update([
            'channel' => 'manual_transfer',
            'provider' => 'manual',
            'proof_path' => $file->store('payment-proofs', 'public'),
            'status' => PaymentTransaction::STATUS_AWAITING_VERIFICATION,
        ]);

        return $transaction->fresh(['bill', 'payer']);
    }

    public function verify(PaymentTransaction $transaction, bool $approve, ?string $reason, User $actor): PaymentTransaction
    {
        if ($transaction->status !== PaymentTransaction::STATUS_AWAITING_VERIFICATION) {
            throw ValidationException::withMessages(['status' => ['Hanya transaksi menunggu verifikasi yang bisa diverifikasi.']]);
        }

        if (! $approve && blank($reason)) {
            throw ValidationException::withMessages(['reason' => ['Alasan penolakan wajib diisi.']]);
        }

        if ($approve) {
            $transaction->update([
                'verified_by' => $actor->id,
                'verified_at' => now(),
            ]);

            return $this->finalizePaid($transaction->fresh(), $actor->name);
        }

        $transaction->update([
            'status' => PaymentTransaction::STATUS_REJECTED,
            'verified_by' => $actor->id,
            'verified_at' => now(),
            'rejection_reason' => $this->htmlSanitizer->sanitize($reason),
        ]);

        $this->notify($transaction->fresh('payer'), PaymentTransaction::STATUS_AWAITING_VERIFICATION, PaymentTransaction::STATUS_REJECTED, $actor->name);

        return $transaction->fresh(['bill', 'payer', 'verifier']);
    }

    public function handleWebhook(string $providerKey, Request $request): PaymentTransaction
    {
        $provider = PaymentProviderRegistry::for($providerKey);

        if (! $provider->verifySignature($request)) {
            abort(403, 'Invalid webhook signature.');
        }

        $webhook = $provider->parseWebhook($request);

        $transaction = PaymentTransaction::where('reference', $webhook->reference)->firstOrFail();

        if ($webhook->status !== 'paid') {
            $transaction->update(['status' => $webhook->status === 'expired' ? PaymentTransaction::STATUS_EXPIRED : PaymentTransaction::STATUS_FAILED]);

            return $transaction->fresh(['bill', 'payer']);
        }

        return $this->finalizePaid($transaction, $provider->key());
    }

    public function simulatePay(PaymentTransaction $transaction, User $actor): PaymentTransaction
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');

        return $this->finalizePaid($transaction, $actor->name.' (simulasi)');
    }

    private function finalizePaid(PaymentTransaction $transaction, string $actorName): PaymentTransaction
    {
        return DB::transaction(function () use ($transaction, $actorName): PaymentTransaction {
            $fresh = PaymentTransaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();

            // Idempotency: replayed webhooks / double taps are a no-op.
            if ($fresh->status === PaymentTransaction::STATUS_PAID) {
                return $fresh->load(['bill', 'payer', 'verifier']);
            }

            if (! in_array($fresh->status, [PaymentTransaction::STATUS_PENDING, PaymentTransaction::STATUS_AWAITING_VERIFICATION], true)) {
                throw ValidationException::withMessages(['status' => ['Transaksi ini tidak bisa dibayar.']]);
            }

            $old = $fresh->status;

            $this->paymentService->create([
                'bill_id' => $fresh->bill_id,
                'amount_paid' => $fresh->amount,
                'payment_date' => now()->toDateString(),
                'notes' => "Online via {$fresh->provider}/{$fresh->channel} ref {$fresh->reference}",
            ], $fresh->user_id);

            $fresh->update(['status' => PaymentTransaction::STATUS_PAID, 'paid_at' => now()]);

            $result = $fresh->fresh(['bill', 'payer', 'verifier']);

            try {
                $result->payer?->notify(new PaymentSettled(
                    $result->id, $old, PaymentTransaction::STATUS_PAID, $actorName, (float) $result->amount,
                ));
            } catch (\Throwable $exception) {
                Log::warning('PaymentTransactionService: failed to store settle notification', [
                    'transaction_id' => $result->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            return $result;
        });
    }

    private function notify(PaymentTransaction $transaction, string $old, string $new, string $actorName): void
    {
        try {
            $transaction->payer?->notify(new PaymentSettled(
                $transaction->id, $old, $new, $actorName, (float) $transaction->amount,
            ));
        } catch (\Throwable $exception) {
            Log::warning('PaymentTransactionService: failed to store notification', [
                'transaction_id' => $transaction->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
```

- [ ] **Step 5: Write resource + controllers + routes + limiter**

`PaymentTransactionResource`: keys `id, bill_id, bill_label (dueType name + period), user_id, payer_name, provider, channel, amount, status, reference, pay_code, qr_payload (= pay_code when channel qris — see note), expires_at, proof_path, verified_by, rejection_reason, paid_at, created_at`. NOTE: service stores QR into `pay_code`; resource exposes BOTH `pay_code` and `qr_payload` (same value when channel is qris, null otherwise) so the frontend test's `qr_payload` structure holds without schema change:

```php
'pay_code' => $this->pay_code,
'qr_payload' => $this->channel === 'qris' ? $this->pay_code : null,
```

`PaymentTransactionController`: `index` (scope: `payments.view.all` else `user_id = me`; filters `status`, `bill_id`), `store` (validate `bill_id|exists`, `channel in qris,va,ewallet`, optional `provider in simulator,xendit,midtrans`, optional `proof image max 2048` — if channel `manual_transfer`, proof REQUIRED and routed to `uploadProof` after create; else `createOnline`), `show` (authorize view), `proof` (authorize view + ownership: only payer may upload; validate image), `verify` (authorize verify; validate `approve boolean`, `reason required_if approve false`), `simulatePay` (authorize view + service aborts non-local).

Bill ownership on store (mirror BillController): allow if `payments.view.all`, else require `bills.view.own` + `bill.resident_id === user.resident_id`, else 403. Bill must be `belum_lunas` (service double-checks).

`PaymentWebhookController::handle(string $provider, Request $request)` → service `handleWebhook` (registry throws 404-via-InvalidArgument → convert: `abort(404)` when provider unknown — wrap in try/catch `InvalidArgumentException`). Return resource 200.

Routes (auth group, after payments block — find it and match style):

```php
    Route::get('payment-transactions', [PaymentTransactionController::class, 'index'])->middleware('can:payments.online');
    Route::post('payment-transactions', [PaymentTransactionController::class, 'store'])->middleware('can:payments.online');
    Route::get('payment-transactions/{paymentTransaction}', [PaymentTransactionController::class, 'show'])->middleware('can:payments.online');
    Route::post('payment-transactions/{paymentTransaction}/proof', [PaymentTransactionController::class, 'proof']);
    Route::post('payment-transactions/{paymentTransaction}/verify', [PaymentTransactionController::class, 'verify']);
    Route::post('payment-transactions/{paymentTransaction}/simulate-pay', [PaymentTransactionController::class, 'simulatePay']);
```

Public group at bottom:

```php
    Route::post('payments/webhook/{provider}', [PaymentWebhookController::class, 'handle'])
        ->name('payments.webhook')
        ->middleware('throttle:webhooks');
```

Limiter next to existing ones:

```php
        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/PaymentTransactionTest.php`
Expected: PASS (6 tests). Watch: `Bill::factory()` required columns (house/resident/due_type/period/amount/status) — check factory; `SimulatorProvider::createInvoice` needs `$transaction->id` for payCode — `createOnline` creates the row first, so id exists. `uploadProof` path: store creates online trx with channel manual_transfer — service `createOnline` calls provider invoice even for manual; harmless (reference overwritten? For manual, skip provider: if channel is manual_transfer, create trx directly with provider `manual`, reference `'MAN-'.random`, expires null — implement this branch in `createOnline` (add at top: manual branch). The test posts proof together with channel manual_transfer — controller: create (manual branch) then uploadProof in same request.

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_10_000006_create_payment_transactions_table.php app/Services/PaymentTransactionService.php app/Http/Controllers/Api/PaymentTransactionController.php app/Http/Controllers/Api/PaymentWebhookController.php app/Http/Resources/PaymentTransactionResource.php app/Notifications/PaymentSettled.php routes/api.php app/Providers/AppServiceProvider.php tests/Feature/Api/PaymentTransactionTest.php
git commit -m "feat: add payment transactions with webhook settlement and manual verify"
```

---

### Task 3: export + backup backend (PDF, Excel, JSON)

**Files:**
- Create: `app/Services/ReportPdfService.php`
- Create: `resources/views/reports/monthly-pdf.blade.php`
- Create: `resources/views/reports/summary-pdf.blade.php`
- Create: `app/Exports/ResidentsExport.php`
- Create: `app/Exports/HousesExport.php`
- Create: `app/Exports/BillsExport.php`
- Create: `app/Exports/PaymentsExport.php`
- Create: `app/Exports/ExpensesExport.php`
- Create: `app/Services/BackupService.php`
- Create: `app/Http/Controllers/Api/ExportController.php`
- Modify: `routes/api.php`
- Modify: `app/Providers/AppServiceProvider.php` (`exports` limiter)
- Test: `tests/Feature/Api/ExportTest.php`

**Interfaces:**
- Consumes: `ReportService::{yearlySummary(int): array, monthlyDetail(int, int): array}` (existing — inspect exact return shape first and adapt the blade views to it; do NOT guess keys).
- Produces: `GET /api/reports/monthly/{y}/{m}/pdf`, `GET /api/reports/summary/{y}/pdf` (`can:reports.view`); `GET /api/exports/{dataset}/xlsx` (`can:reports.view` for finance datasets, admin datasets need `residents.view`/`houses.view` — simplest: `can:reports.view` for bills/payments/expenses, `can:residents.view` for residents, `can:houses.view` for houses; implement per-dataset gate map in controller); `GET /api/backup/json` (admin-only: `users.manage` gate reuse — check existing users gate name first, likely `can:users.manage`).

- [ ] **Step 1: Install the new deps (needs user approval)**

Run in `src/backend/`: `composer require barryvdh/laravel-dompdf maatwebsite/excel`

If the user declines, STOP and report NEEDS_CONTEXT — Task 3 cannot proceed as specified (fallback would be a plan change).

- [ ] **Step 2: Write the failing tests**

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\House;
use App\Models\Payment;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $warga;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([PermissionSeeder::class, RoleSeeder::class]);

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        $this->admin->load('roles.permissions');

        $this->warga = User::factory()->create();
        $this->warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        $this->warga->load('roles.permissions');

        $resident = Resident::factory()->create();
        $house = House::factory()->create();
        $house->residents()->attach($resident->id, ['start_date' => now()->subMonth()]);
        $dueType = DueType::factory()->create();
        $bill = Bill::factory()->create([
            'house_id' => $house->id, 'resident_id' => $resident->id,
            'due_type_id' => $dueType->id, 'amount_due' => 50000, 'status' => 'belum_lunas',
        ]);
        Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 50000]);
        Expense::factory()->create();
    }

    public function test_monthly_pdf_download()
    {
        $response = $this->actingAs($this->admin)->get('/api/reports/monthly/'.now()->year.'/'.now()->month.'/pdf');

        $response->assertStatus(200)->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $response->streamedContent());
    }

    public function test_summary_pdf_download()
    {
        $this->actingAs($this->admin)->get('/api/reports/summary/'.now()->year.'/pdf')
            ->assertStatus(200)->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_excel_exports_download_with_correct_mime()
    {
        foreach (['residents', 'houses', 'bills', 'payments', 'expenses'] as $dataset) {
            $this->actingAs($this->admin)->get("/api/exports/{$dataset}/xlsx")
                ->assertStatus(200)
                ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        }
    }

    public function test_backup_json_has_all_domains_without_passwords()
    {
        $backup = $this->actingAs($this->admin)->getJson('/api/backup/json')
            ->assertStatus(200)->assertJsonStructure(['data' => ['meta', 'domains']])->json('data');

        foreach (['residents', 'houses', 'bills', 'payments', 'expenses', 'users'] as $domain) {
            $this->assertArrayHasKey($domain, $backup['domains']);
        }

        $this->assertStringNotContainsString('password', json_encode($backup['domains']['users']));
    }

    public function test_warga_cannot_export_or_backup()
    {
        $this->actingAs($this->warga)->get('/api/reports/monthly/'.now()->year.'/'.now()->month.'/pdf')
            ->assertStatus(403);
        $this->actingAs($this->warga)->get('/api/exports/bills/xlsx')->assertStatus(403);
        $this->actingAs($this->warga)->getJson('/api/backup/json')->assertStatus(403);
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/Api/ExportTest.php`
Expected: FAIL — routes don't exist (404s).

- [ ] **Step 4: Write PDF service + blade views**

`ReportPdfService`: `monthly(int $year, int $month): \Barryvdh\DomPDF\PDF` and `summary(int $year)` — call `ReportService` (inspect return shape!), pass to `Pdf::loadView('reports.monthly-pdf', [...])` with paper A4 portrait. Filenames: `laporan-bulanan-{y}-{m}.pdf`, `laporan-tahunan-{y}.pdf` via `download()`.

Blade views: kop "SIWarga — Laporan Kas RT", periode, ringkasan angka (adapt keys to ReportService output — READ the service first), tabel rincian, footer tanda tangan (Ketua RT / Bendahara, tanggal cetak). Keep styling inline-CSS (DomPDF-compatible: no flexbox).

- [ ] **Step 5: Write Excel exports + backup service**

Each export implements `FromCollection, WithHeadings` (+ `WithMapping` where relations needed). Headings Bahasa Indonesia. Datasets:
- Residents: `full_name, status, phone_number, marital_status` (+ house_number via active house — use `with('houses')`? Keep simple: map first active house number; N+1 acceptable for export scale, or join. Use eager load.)
- Houses: `house_number, address, status`.
- Bills: `house_number, resident, due_type, period_start, period_end, amount_due, status` (+ optional `?month=`/`?year=` filter on period_start).
- Payments: `bill_id, house_number, amount_paid, payment_date, notes`.
- Expenses: `category, description, amount, expense_date` (check Expense columns first — inspect model).

`BackupService::dump(): array` returns `['meta' => ['version' => 1, 'exported_at' => now()->toIso8601String(), 'app' => config('app.name')], 'domains' => [...]]` with domains: residents, houses, house_residents, due_types, bills, payments, expenses, expense_categories, users (strip `password`, `remember_token`), roles, permissions, announcements, tickets, facilities, facility_bookings, assets, asset_loans, events, guest_logs, panic_alerts, patrol_schedules, family_members, emergency_contacts, payment_transactions — each `Model::withTrashed()->get()` (only where SoftDeletes used; plain `get()` otherwise). Wrap per-domain in try/catch? No — fail loudly is fine for admin backup. Memory: fine at RT scale.

- [ ] **Step 6: Write controller + routes + limiter**

`ExportController`: `monthlyPdf($y,$m)`, `summaryPdf($y)`, `dataset($dataset)` (validate dataset in list, per-dataset gate map, finance month/year filter passthrough), `backup()` (admin gate). All export routes get `throttle:exports`. ActivityLog: explicit `ActivityLog::create([... 'user_id' => auth()->id(), 'action' => 'export.laporan' / 'export.data' / 'backup.json', 'description' => ..., 'ip_address' => request()->ip(), 'url' => request()->fullUrl()])` — check ActivityLogObserver doesn't double-log (it observes model events on domain models, not ActivityLog itself — verify quickly).

Routes:

```php
    Route::get('reports/monthly/{year}/{month}/pdf', [ExportController::class, 'monthlyPdf'])->middleware('can:reports.view');
    Route::get('reports/summary/{year}/pdf', [ExportController::class, 'summaryPdf'])->middleware('can:reports.view');
    Route::get('exports/{dataset}/xlsx', [ExportController::class, 'dataset']);
    Route::get('backup/json', [ExportController::class, 'backup']);
```

Limiter:

```php
        RateLimiter::for('exports', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
        });
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/Api/ExportTest.php`
Expected: PASS (5 tests).

- [ ] **Step 8: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/ReportPdfService.php resources/views/reports/ app/Exports/ app/Services/BackupService.php app/Http/Controllers/Api/ExportController.php routes/api.php app/Providers/AppServiceProvider.php tests/Feature/Api/ExportTest.php composer.json composer.lock
git commit -m "feat: add PDF/Excel/JSON export and backup"
```

---

### Task 4: payment + export frontend

**Files:**
- Modify: `src/types/api.ts` (append types)
- Create: `src/services/payments-online.ts`
- Create: `src/services/exports.ts`
- Create: `src/hooks/use-payments-online.ts`
- Create: `src/hooks/use-exports.ts`
- Create: `src/features/siwarga-payments-online/payments-online-page.tsx`
- Create: `src/features/siwarga-exports/exports-page.tsx`
- Create: `src/routes/_authenticated/payments-online/index.tsx`
- Create: `src/routes/_authenticated/exports/index.tsx`
- Modify: `src/components/layout/data/sidebar-data.ts`

**Interfaces:**
- Consumes: Task 2–3 endpoints + resource keys (verify exact key names from the committed backend before writing types — `reference`, `pay_code`, `qr_payload`, `expires_at`, `proof_path`, `rejection_reason`, `paid_at`).
- Produces: pages at `/payments-online`, `/exports`; hooks `usePaymentTransactions`, `useCreateTransaction`, `useUploadProof`, `useVerifyTransaction`, `useSimulatePay`.

- [ ] **Step 1: Append TS types**

```ts
export type PaymentProvider = 'simulator' | 'xendit' | 'midtrans' | 'manual'
export type PaymentChannel = 'qris' | 'va' | 'ewallet' | 'manual_transfer'
export type PaymentTrxStatus =
  | 'pending'
  | 'awaiting_verification'
  | 'paid'
  | 'expired'
  | 'failed'
  | 'rejected'

export interface PaymentTransaction {
  id: number
  bill_id: number
  bill_label: string | null
  user_id: number
  payer_name: string | null
  provider: string
  channel: PaymentChannel
  amount: string
  status: PaymentTrxStatus
  reference: string
  pay_code: string | null
  qr_payload: string | null
  expires_at: string | null
  proof_path: string | null
  verified_by: number | null
  rejection_reason: string | null
  paid_at: string | null
  created_at: string
}

export interface PaymentTrxFilter {
  page?: number
  per_page?: number
  status?: PaymentTrxStatus
  bill_id?: number
}

export type ExportDataset =
  | 'residents'
  | 'houses'
  | 'bills'
  | 'payments'
  | 'expenses'
```

- [ ] **Step 2: Write services and hooks**

`src/services/payments-online.ts`:

```ts
import type {
  ApiResponse,
  PaginatedResponse,
  PaymentChannel,
  PaymentTransaction,
  PaymentTrxFilter,
} from '@/types/api'
import api from './api'

export const paymentsOnlineService = {
  getAll: (params?: PaymentTrxFilter) =>
    api.get<PaginatedResponse<PaymentTransaction>>('/api/payment-transactions', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<PaymentTransaction>>(`/api/payment-transactions/${id}`),
  create: (input: { bill_id: number; channel: PaymentChannel; provider?: string; proof?: File }) => {
    const form = new FormData()
    form.append('bill_id', String(input.bill_id))
    form.append('channel', input.channel)
    if (input.provider) form.append('provider', input.provider)
    if (input.proof) form.append('proof', input.proof)
    return api.post<ApiResponse<PaymentTransaction>>('/api/payment-transactions', form)
  },
  verify: (id: number, approve: boolean, reason?: string) =>
    api.post<ApiResponse<PaymentTransaction>>(`/api/payment-transactions/${id}/verify`, { approve, reason }),
  simulatePay: (id: number) =>
    api.post<ApiResponse<PaymentTransaction>>(`/api/payment-transactions/${id}/simulate-pay`),
}
```

`src/services/exports.ts`:

```ts
import api from './api'
import type { ExportDataset } from '@/types/api'

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const exportsService = {
  monthlyPdf: async (year: number, month: number) => {
    const res = await api.get(`/api/reports/monthly/${year}/${month}/pdf`, { responseType: 'blob' })
    downloadBlob(res.data, `laporan-bulanan-${year}-${month}.pdf`)
  },
  summaryPdf: async (year: number) => {
    const res = await api.get(`/api/reports/summary/${year}/pdf`, { responseType: 'blob' })
    downloadBlob(res.data, `laporan-tahunan-${year}.pdf`)
  },
  dataset: async (dataset: ExportDataset, params?: { month?: number; year?: number }) => {
    const res = await api.get(`/api/exports/${dataset}/xlsx`, { params, responseType: 'blob' })
    downloadBlob(res.data, `${dataset}.xlsx`)
  },
  backup: async () => {
    const res = await api.get('/api/backup/json', { responseType: 'blob' })
    downloadBlob(res.data, `siwarga-backup-${new Date().toISOString().slice(0, 10)}.json`)
  },
}
```

Hooks mirror `use-suggestions.ts` (query + mutations, Bahasa toasts: 'Transaksi pembayaran dibuat', 'Bukti terkirim, menunggu verifikasi', 'Pembayaran diverifikasi', 'Transaksi ditolak', 'Simulasi berhasil'). Detail query polls: `usePaymentTransaction(id)` with `refetchInterval: (q) => ['pending','awaiting_verification'].includes(q.state.data?.data.status) ? 5000 : false` — NOTE Task 6 lesson: raw axios shape pre-select, so drill `.data.data.status` — verify against actual `select` usage in this file and typecheck.

- [ ] **Step 3: Write the pages**

`payments-online-page.tsx` — two tabs/sections: (1) "Bayar Tagihan": bill selector (unpaid bills via `billsService`, filter `status=belum_lunas`), channel select (QRIS/VA/manual), provider select (simulator/xendit — show only configured? keep static list simulator+xendit), file input for manual proof; on create show QR (`QRCodeSVG` from qrcode.react — already installed Fase 4) for `qr_payload` or VA number + expiry countdown text + auto-refresh detail; (2) "Riwayat": table with status badges + verify buttons (approve/reject+reason dialog) gated by `useHasPermission('payments.verify')`. Accessible names (Task 6 e2e contract): `Bayar Online`, `Kirim Pembayaran`, `Setujui`, `Tolak`, `Upload Bukti`.

`exports-page.tsx` — cards per export: monthly PDF (year+month inputs), yearly PDF (year input), 5 dataset buttons (+month/year optional for finance), backup JSON button; all gated by permissions (`reports.view` etc. — hide buttons user can't use); download errors → toast 'Gagal mengunduh'.

- [ ] **Step 4: Routes + sidebar**

Routes mirror Task-6-phase-4 pattern (`page` + `status` zod schemas). Sidebar: "Bayar Online" (`/payments-online`, `payments.online`) under Keuangan group (find it); "Export & Backup" (`/exports`, `reports.view`) under Laporan/Admin group. Check existing group structure first.

- [ ] **Step 5: Verify with build**

Run: `npm run build` (in `src/frontend/`)
Expected: clean build.

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add src/types/api.ts src/services/payments-online.ts src/services/exports.ts src/hooks/use-payments-online.ts src/hooks/use-exports.ts src/features/siwarga-payments-online/payments-online-page.tsx src/features/siwarga-exports/exports-page.tsx src/routes/_authenticated/payments-online/index.tsx src/routes/_authenticated/exports/index.tsx src/components/layout/data/sidebar-data.ts
git commit -m "feat: add online payment and export UI"
```

---

### Task 5: PWA (manifest, service worker, icons, registration)

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/offline.html`
- Create: `public/images/icon-192.png`
- Create: `public/images/icon-512.png`
- Create: `public/images/icon-maskable-512.png`
- Modify: `index.html`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: nothing backend. Produces: installable PWA shell verified by Task 6 e2e.

- [ ] **Step 1: Generate icons with PIL**

Run in `src/frontend/`:

```bash
python3 -c "
from PIL import Image
base = Image.open('public/images/favicon.png').convert('RGBA')
for size in (192, 512):
    img = base.resize((size, size), Image.LANCZOS)
    img.save(f'public/images/icon-{size}.png')
bg = Image.new('RGBA', (512, 512), (22, 101, 52, 255))
inner = base.resize((360, 360), Image.LANCZOS)
bg.alpha_composite(inner, (76, 76))
bg.save('public/images/icon-maskable-512.png')
print('icons written')
"
```

Verify outputs are valid PNGs (`file public/images/icon-*.png`).

- [ ] **Step 2: Write manifest + offline page**

`public/manifest.webmanifest`:

```json
{
  "name": "SIWarga",
  "short_name": "SIWarga",
  "description": "Sistem administrasi RT untuk warga, rumah, iuran, dan keuangan.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#166534",
  "icons": [
    { "src": "/images/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/images/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/images/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`public/offline.html`: minimal standalone page (inline CSS, Bahasa Indonesia: "Anda sedang offline — SIWarga membutuhkan koneksi internet.").

- [ ] **Step 3: Write the service worker**

`public/sw.js` (vanilla, no build step):

```js
const CACHE = 'siwarga-shell-v1'
const SHELL = ['/', '/offline.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API always goes to network — no offline data in this phase.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
    return
  }

  event.respondWith(
    caches.match(event.request).then(
      (hit) => hit ?? fetch(event.request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return res
      }),
    ),
  )
})
```

- [ ] **Step 4: Wire manifest link + registration**

`index.html`: add `<link rel="manifest" href="/manifest.webmanifest" />` and `<meta name="theme-color" content="#166534" />` (keep existing `#fff`? Replace — PWA theme should match manifest; check current line and replace).

`src/main.tsx`: after the `createRoot(...).render(...)` call (find exact lines first), append:

```tsx
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support unavailable — app still works online.
    })
  })
}
```

Plus update toast on new version: listen `registration.waiting` → `toast.info('Versi baru tersedia, muat ulang halaman')`. Keep it to ~15 lines; check existing toast import in main.tsx (sonner already imported per earlier read).

- [ ] **Step 5: Verify with build**

Run: `npm run build` then confirm `dist/manifest.webmanifest`, `dist/sw.js`, `dist/offline.html`, `dist/images/icon-*.png` exist (vite copies `public/` verbatim).

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add public/manifest.webmanifest public/sw.js public/offline.html public/images/icon-192.png public/images/icon-512.png public/images/icon-maskable-512.png index.html src/main.tsx
git commit -m "feat: add installable PWA shell"
```

---

### Task 6: e2e coverage + full verification

**Files:**
- Create: `src/frontend/e2e/siwarga/fase-5-convenience.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–5. Helpers: `test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL`. Provider under test: `simulator` only (config override in test setup or `.env` testing — use per-request `provider: 'simulator'` field, never depend on server env).
- Produces: 4 green e2e flows; full-suite verification evidence.

Accessible names (exact, from Task 4): `Bayar Online`, `Kirim Pembayaran`, `Setujui`, `Tolak`, `Upload Bukti`. Adapt selectors to UI within allowance, never rename UI.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect, apiToken, apiPost, apiGet, uid, defaultAdmin, apiBaseURL } from './setup'

test.describe('Fase 5 convenience', () => {
  test('simulator qris pay settles the bill', async ({ page }) => {
    // per-test warga user (panic-test pattern Task 8 Fase 4), unpaid bill via apiPost,
    // UI: /payments-online → Bayar Online → Kirim Pembayaran → simulate-pay button?
    // NOTE: simulator settle in UI needs a dev affordance — the spec API has
    // simulate-pay; UI exposes a "Simulasi Bayar (dev)" button ONLY when
    // import.meta.env.DEV. Assert via apiGet detail status paid + bills lunas.
  })

  test('manual proof upload then bendahara verify settles', async ({ page }) => {
    // warga uploads proof via UI (Upload Bukti), bendahara Setujui via UI,
    // assert paid + lunas; then a second case Tolak with reason → rejected + bill open.
  })

  test('monthly PDF downloads with PDF magic', async ({ request }) => {
    const token = await apiToken(defaultAdmin.email, defaultAdmin.password)
    const res = await request.get(`${apiBaseURL}/api/reports/monthly/2026/1/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-type']).toContain('application/pdf')
    const buf = await res.body()
    expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  })

  test('PWA manifest linked and service worker registered', async ({ page }) => {
    await page.goto('/')
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href')
    expect(manifest).toBe('/manifest.webmanifest')
    const sw = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(sw).toBeTruthy()
    // NOTE: SW only registers in PROD build — run this spec against
    // `vite preview` (production build) OR assert registration conditionally:
    // if dev, assert the register call exists in main bundle? Simplest: run
    // the PWA test against `npm run preview -- --port 4173` with baseURL override.
  })
})
```

Expand the skeleton into the full spec following `fase-4-security.spec.ts` (per-test users, `uid()` names, no sleeps, API-state assertions). DECISION REQUIRED at implementation: the PWA test needs the PROD build (`vite preview`) since SW registers only in PROD — implementer: build once (`npm run build`), serve via `npx vite preview --port 4173`, and point ONLY the PWA test at it (or run whole spec file against preview; preview serves same `dist/` — but API baseURL must still reach backend :8000, which it does via absolute `apiBaseURL`/VITE_API_URL). Document the chosen approach in the report. Simulator-settle UI: use the dev-only simulate button if Task 4 built it, else settle via `apiPost` simulate-pay endpoint + assert UI reflects paid on reload.

- [ ] **Step 2: Start dev servers and run the new spec**

Backend `:8000` + frontend dev `:5173` (+ preview `:4173` for the PWA test per Step 1 decision). `npx playwright install chromium` if needed, else BLOCKED.

Run: `npx playwright test e2e/siwarga/fase-5-convenience.spec.ts`
Expected: 4/4 PASS.

- [ ] **Step 3: Run the FULL verification**

`composer test`, `npm run build`, `npm run test`, full `npx playwright test`. Triage pre-existing (pint billing drift, phpstan missingType, vitest kerberos) with file evidence; fix only this-plan breakage in owning files under TDD.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/e2e/siwarga/fase-5-convenience.spec.ts
git commit -m "test: add Fase 5 convenience e2e (payment, export, PWA)"
```

---

## Self-Review

**1. Spec coverage:** §2.1 contract/registry → Task 1 ✓; §2.2 table → Tasks 1–2 ✓; §2.3 Xendit/sim flow → Tasks 1–2 ✓ (webhook idempotent, muara reuse PaymentService) ✓; §2.4 manual → Task 2 ✓ (proof cleanup on replace; delete-cleanup follows Fase 3 gallery lesson — note: implementer must also delete file on transaction force-delete; controller `destroy` not specified — SKIP destroy endpoint entirely in this phase: no route, no UI delete; state transitions only. Rationale: financial audit trail must not be deletable.); §2.5 RBAC → Tasks 1–2 ✓; §3 table → Task 3 ✓ (all 4 rows); §4 PWA → Task 5 ✓; §5 endpoints → Tasks 2–3 ✓; §6 tests → Tasks 1–3, 6 ✓; §7 deps/config → Tasks 1, 3 ✓.

**2. Placeholder scan:** fixed during writing — no TBD/TODO/"similar to". One deliberate delegation: blade views adapt to `ReportService` return shape (implementer instructed to READ the service first, exact method names given). Frontend pages reference the tickets pattern for layout only; all contracts specified.

**3. Type consistency:** `PaymentTransaction` TS keys match the specified `toArray` keys; hook/service names consistent across Tasks 4 and 6; `PaymentProvider`/`ProviderInvoice`/`ProviderWebhook` signatures identical in Tasks 1–2; permission strings (`payments.online`, `payments.verify`) identical in seeder/gates/routes/UI.
