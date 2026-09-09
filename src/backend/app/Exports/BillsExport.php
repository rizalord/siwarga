<?php

namespace App\Exports;

use App\Models\Bill;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class BillsExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private ?int $month = null, private ?int $year = null) {}

    public function collection(): Collection
    {
        return Bill::with(['house', 'resident', 'dueType'])
            ->when($this->month, fn ($query) => $query->whereMonth('period_start', $this->month))
            ->when($this->year, fn ($query) => $query->whereYear('period_start', $this->year))
            ->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Nomor Rumah', 'Penghuni', 'Jenis Iuran', 'Periode Mulai', 'Periode Selesai', 'Jumlah Tagihan', 'Status'];
    }

    /**
     * @param  mixed  $bill
     * @return array<int, mixed>
     */
    public function map($bill): array
    {
        return [
            $bill->house?->house_number,
            $bill->resident?->full_name,
            $bill->dueType?->name,
            optional($bill->period_start)->format('Y-m-d'),
            optional($bill->period_end)->format('Y-m-d'),
            $bill->amount_due,
            $bill->status,
        ];
    }
}
