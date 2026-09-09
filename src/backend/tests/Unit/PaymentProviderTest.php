<?php

namespace Tests\Unit;

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
