<?php

namespace App\Exports;

use App\Models\House;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements FromCollection<int, House>
 * @implements WithMapping<House>
 */
class HousesExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, House>
     */
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
     * @param  House  $house
     * @return array<int, mixed>
     */
    public function map(mixed $house): array
    {
        return [
            $house->house_number,
            $house->address,
            $house->status,
        ];
    }
}
