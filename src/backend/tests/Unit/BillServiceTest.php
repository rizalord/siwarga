<?php

namespace Tests\Unit;

use App\Models\Bill;
use App\Models\Payment;
use App\Services\BillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BillServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cannot_delete_bill_with_payments()
    {
        $bill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $bill->id]);

        $this->expectException(ValidationException::class);

        (new BillService)->delete($bill);
    }

    public function test_can_delete_bill_without_payments()
    {
        $bill = Bill::factory()->create();

        (new BillService)->delete($bill);

        $this->assertSoftDeleted($bill);
    }

    public function test_deletable_ids_excludes_bills_with_payments()
    {
        $freeBill = Bill::factory()->create();
        $paidBill = Bill::factory()->create();
        Payment::factory()->create(['bill_id' => $paidBill->id]);

        $deletableIds = (new BillService)->deletableIds([$freeBill->id, $paidBill->id]);

        $this->assertEquals([$freeBill->id], $deletableIds->all());
    }
}
