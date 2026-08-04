<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_marks_bill_as_lunas_when_fully_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);
        $user = User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 100000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals('lunas', $bill->fresh()->status);
    }

    public function test_create_keeps_bill_unpaid_when_partially_paid()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'belum_lunas']);
        $user = User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 40000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals('belum_lunas', $bill->fresh()->status);
    }

    public function test_delete_recalculates_bill_status_back_to_belum_lunas()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 100000]);

        (new PaymentService)->delete($payment);

        $this->assertEquals('belum_lunas', $bill->fresh()->status);
        $this->assertSoftDeleted($payment);
    }

    public function test_create_downgrades_bill_from_lunas_to_belum_lunas_when_actual_payments_are_insufficient()
    {
        $bill = Bill::factory()->create(['amount_due' => 100000, 'status' => 'lunas']);
        $user = User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 40000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals('belum_lunas', $bill->fresh()->status);
    }

    public function test_create_rejects_payment_that_exceeds_bill_remaining()
    {
        $bill = Bill::factory()->create(['amount_due' => 15000, 'status' => 'belum_lunas']);
        $user = User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 10000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->expectException(ValidationException::class);

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 15000,
            'payment_date' => now()->toDateString(),
        ], $user->id);
    }

    public function test_create_allows_payment_upto_exact_remaining()
    {
        $bill = Bill::factory()->create(['amount_due' => 15000, 'status' => 'belum_lunas']);
        $user = User::factory()->create();

        (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 10000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $payment = (new PaymentService)->create([
            'bill_id' => $bill->id,
            'amount_paid' => 5000,
            'payment_date' => now()->toDateString(),
        ], $user->id);

        $this->assertEquals(5000, $payment->amount_paid);
        $this->assertEquals('lunas', $bill->fresh()->status);
    }

    public function test_update_rejects_payment_that_exceeds_bill_remaining()
    {
        $bill = Bill::factory()->create(['amount_due' => 15000, 'status' => 'belum_lunas']);
        Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 10000]);
        $payment = Payment::factory()->create(['bill_id' => $bill->id, 'amount_paid' => 4000]);

        $this->expectException(ValidationException::class);

        (new PaymentService)->update($payment, ['amount_paid' => 15000]);
    }
}
