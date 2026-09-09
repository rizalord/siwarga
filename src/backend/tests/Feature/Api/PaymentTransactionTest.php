<?php

namespace Tests\Feature\Api;

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
use Illuminate\Support\Facades\Http;
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

    public function test_bendahara_can_list_and_view_verification_inbox()
    {
        Storage::fake('public');

        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'manual_transfer',
            'proof' => UploadedFile::fake()->image('bukti.jpg'),
        ])->assertStatus(201)->assertJsonPath('data.status', 'awaiting_verification')->json('data');

        $this->actingAs($this->bendahara)->getJson('/api/payment-transactions?status=awaiting_verification')
            ->assertStatus(200)
            ->assertJsonPath('data.0.reference', $created['reference']);

        $this->actingAs($this->bendahara)->getJson("/api/payment-transactions/{$created['id']}")
            ->assertStatus(200)
            ->assertJsonPath('data.reference', $created['reference']);
    }

    public function test_webhook_wrong_provider_is_rejected()
    {
        $this->postJson('/api/public/payments/webhook/nope', [])->assertStatus(404);
    }

    public function test_simulator_webhook_blocked_outside_local_testing()
    {
        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'qris',
        ])->json('data');

        $originalEnv = app()->environment();
        app()->detectEnvironment(fn () => 'production');

        try {
            $this->postJson('/api/public/payments/webhook/simulator', [
                'reference' => $created['reference'],
                'status' => 'paid',
            ])->assertStatus(403);
        } finally {
            app()->detectEnvironment(fn () => $originalEnv);
        }

        $this->assertEquals('pending', PaymentTransaction::find($created['id'])->status);
    }

    public function test_proof_url_exposed_and_resolvable()
    {
        Storage::fake('public');

        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'manual_transfer',
            'proof' => UploadedFile::fake()->image('bukti.jpg'),
        ])->assertStatus(201)->assertJsonPath('data.status', 'awaiting_verification')->json('data');

        $this->assertNotNull($created['proof_url']);
        $this->assertStringContainsString($created['proof_path'], $created['proof_url']);
        Storage::disk('public')->assertExists($created['proof_path']);

        $this->actingAs($this->bendahara)->getJson("/api/payment-transactions/{$created['id']}")
            ->assertStatus(200)
            ->assertJsonPath('data.proof_url', $created['proof_url']);
    }

    public function test_non_paid_webhook_after_settlement_is_noop()
    {
        $created = $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'qris',
        ])->json('data');

        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$created['id']}/simulate-pay")
            ->assertStatus(200)->assertJsonPath('data.status', 'paid');

        $this->postJson('/api/public/payments/webhook/simulator', [
            'reference' => $created['reference'],
            'status' => 'failed',
        ])->assertStatus(200)->assertJsonPath('data.status', 'paid');

        $this->assertEquals('paid', PaymentTransaction::find($created['id'])->status);
        $this->assertEquals(1, Payment::where('bill_id', $this->bill->id)->count());
        $this->assertEquals('lunas', $this->bill->fresh()->status);
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

    public function test_concurrent_settle_yields_exactly_one_payment()
    {
        // Adapted from brief: pin amount to bill amount_due (factory defaults
        // to 75000 while setUp bill is 50000, which would 422 on first settle
        // via overpay guard instead of exercising the bill lock).
        $first = PaymentTransaction::factory()->create([
            'bill_id' => $this->bill->id,
            'user_id' => $this->warga->id,
            'amount' => $this->bill->amount_due,
            'status' => 'pending',
            'provider' => 'simulator',
        ]);
        $second = PaymentTransaction::factory()->create([
            'bill_id' => $this->bill->id,
            'user_id' => $this->warga->id,
            'amount' => $this->bill->amount_due,
            'status' => 'pending',
            'provider' => 'simulator',
        ]);

        // Sequential simulation of the race: first wins, second must 422.
        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$first->id}/simulate-pay")
            ->assertStatus(200)->assertJsonPath('data.status', 'paid');
        $this->actingAs($this->warga)->postJson("/api/payment-transactions/{$second->id}/simulate-pay")
            ->assertStatus(422)
            ->assertJsonPath('errors.bill_id.0', 'Tagihan ini sudah lunas.');

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

    public function test_xendit_invoice_uses_basic_auth()
    {
        config()->set('services.xendit.secret_key', 'test-secret-key');
        Http::fake([
            '*/qr_codes' => Http::response([
                'id' => 'qr_123',
                'qr_string' => 'QRTESTPAYLOAD',
                'expires_at' => now()->addMinutes(30)->toIso8601String(),
            ], 200),
            '*/callback_virtual_accounts' => Http::response([
                'id' => 'cva_123',
                'account_number' => '1234567890',
                'expiration_date' => now()->addHours(24)->toIso8601String(),
            ], 200),
        ]);

        $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'qris',
            'provider' => 'xendit',
        ])->assertStatus(201);

        $this->actingAs($this->warga)->postJson('/api/payment-transactions', [
            'bill_id' => $this->bill->id,
            'channel' => 'va',
            'bank_code' => 'BRI',
            'provider' => 'xendit',
        ])->assertStatus(201);

        Http::assertSent(function ($request) {
            $header = $request->header('Authorization')[0] ?? '';

            return str_contains($request->url(), '/qr_codes')
                && $header === 'Basic '.base64_encode('test-secret-key:');
        });

        Http::assertSent(function ($request) {
            $header = $request->header('Authorization')[0] ?? '';

            return str_contains($request->url(), '/callback_virtual_accounts')
                && $header === 'Basic '.base64_encode('test-secret-key:');
        });
    }
}
