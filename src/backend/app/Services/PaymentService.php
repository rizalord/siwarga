<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, int $createdBy): Payment
    {
        $data['created_by'] = $createdBy;

        $payment = Payment::create($data);

        $this->refreshBillStatuses([$payment->bill_id]);

        return $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Payment $payment, array $data): Payment
    {
        $oldBillId = $payment->bill_id;
        $payment->update($data);

        $this->refreshBillStatuses([$oldBillId, $payment->bill_id]);

        return $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);
    }

    public function delete(Payment $payment): void
    {
        $billId = $payment->bill_id;

        DB::transaction(function () use ($payment, $billId) {
            $payment->delete();
            $this->refreshBillStatuses([$billId]);
        });
    }

    /**
     * @param  array<int, int>  $ids
     */
    public function bulkDelete(array $ids): int
    {
        $payments = Payment::whereIn('id', $ids)->get();
        $billIds = $payments->pluck('bill_id')->unique();

        return DB::transaction(function () use ($payments, $billIds) {
            $deleted = Payment::destroy($payments->pluck('id'));
            $this->refreshBillStatuses($billIds->all());

            return $deleted;
        });
    }

    public function afterBulkRestore(EloquentCollection $payments): void
    {
        $this->refreshBillStatuses($payments->pluck('bill_id')->all());
    }

    public function afterRestore(Payment $payment): void
    {
        $this->refreshBillStatuses([$payment->bill_id]);
    }

    /**
     * @param  array<int, int|null>  $billIds
     */
    public function refreshBillStatuses(array $billIds): void
    {
        $filteredBillIds = collect($billIds)
            ->filter()
            ->unique()
            ->values();

        if ($filteredBillIds->isEmpty()) {
            return;
        }

        Bill::whereIn('id', $filteredBillIds)->each(function (Bill $bill): void {
            $totalPaid = $bill->payments()->sum('amount_paid');

            $bill->update([
                'status' => $totalPaid >= $bill->amount_due ? 'lunas' : 'belum_lunas',
            ]);
        });
    }
}
