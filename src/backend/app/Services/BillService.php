<?php

namespace App\Services;

use App\Models\Bill;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class BillService
{
    public function delete(Bill $bill): void
    {
        if ($bill->payments()->exists()) {
            throw ValidationException::withMessages([
                'bill' => ['Tagihan tidak bisa dihapus karena sudah memiliki pembayaran.'],
            ]);
        }

        $bill->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return Bill::whereIn('id', $ids)
            ->whereDoesntHave('payments')
            ->pluck('id');
    }
}
