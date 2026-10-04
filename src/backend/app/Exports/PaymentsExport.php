<?php

namespace App\Exports;

use App\Models\Payment;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements FromCollection<int, Payment>
 * @implements WithMapping<Payment>
 */
class PaymentsExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, Payment>
     */
    public function collection(): Collection
    {
        return Payment::with('bill.house')->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['ID Tagihan', 'Nomor Rumah', 'Jumlah Bayar', 'Tanggal Bayar', 'Catatan'];
    }

    /**
     * @param  Payment  $payment
     * @return array<int, mixed>
     */
    public function map(mixed $payment): array
    {
        return [
            $payment->bill_id,
            $payment->bill?->house?->house_number,
            $payment->amount_paid,
            $payment->payment_date->format('Y-m-d'),
            $payment->notes,
        ];
    }
}
