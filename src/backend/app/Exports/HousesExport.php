<?php

namespace App\Exports;

use App\Models\House;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class HousesExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection(): Collection
    {
        return House::query()->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Nomor Rumah', 'Alamat', 'Status'];
    }

    /**
     * @param  mixed  $house
     * @return array<int, mixed>
     */
    public function map($house): array
    {
        return [
            $house->house_number,
            $house->address,
            $house->status,
        ];
    }
}
