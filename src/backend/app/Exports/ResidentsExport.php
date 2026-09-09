<?php

namespace App\Exports;

use App\Models\Resident;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ResidentsExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection(): Collection
    {
        return Resident::with('activeHouse')->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Nama Lengkap', 'Status', 'No. Telepon', 'Status Perkawinan', 'No. Rumah'];
    }

    /**
     * @param  mixed  $resident
     * @return array<int, mixed>
     */
    public function map($resident): array
    {
        return [
            $resident->full_name,
            $resident->status,
            $resident->phone_number,
            $resident->marital_status,
            $resident->activeHouse->first()?->house_number,
        ];
    }
}
