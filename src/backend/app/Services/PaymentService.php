<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, int $createdBy): Payment
    {
        $this->assertWithinRemaining((int) $data['bill_id'], (float) $data['amount_paid']);

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
        $newBillId = (int) ($data['bill_id'] ?? $payment->bill_id);
        $newAmount = (float) ($data['amount_paid'] ?? $payment->amount_paid);

        $this->assertWithinRemaining($newBillId, $newAmount, $payment->id);

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

    /**
     * @param  EloquentCollection<int, Payment>  $payments
     */
    public function afterBulkRestore(EloquentCollection $payments): void
    {
        $this->refreshBillStatuses($payments->pluck('bill_id')->all());
    }

    public function afterRestore(Payment $payment): void
    {
        $this->refreshBillStatuses([$payment->bill_id]);
    }

    /**
     * Pastikan nominal pembayaran tidak melebihi sisa tagihan.
     *
     * @throws ValidationException
     */
    private function assertWithinRemaining(int $billId, float $amount, ?int $ignorePaymentId = null): void
    {
        $bill = Bill::findOrFail($billId);

        $totalPaid = $bill->payments()
            ->when($ignorePaymentId !== null, fn ($query) => $query->where('id', '!=', $ignorePaymentId))
            ->sum('amount_paid');

        $remaining = (float) $bill->amount_due - (float) $totalPaid;

        if ($amount > $remaining) {
            throw ValidationException::withMessages([
                'amount_paid' => [
                    'Nominal pembayaran melebihi sisa tagihan. Sisa tagihan: Rp '
                    .number_format($remaining, 0, ',', '.').'.',
                ],
            ]);
        }
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
