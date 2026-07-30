<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\House;
use App\Models\HouseResident;
use App\Models\Resident;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class HouseService
{
    public function delete(House $house): void
    {
        if ($house->houseResidents()->whereNull('end_date')->exists()) {
            throw ValidationException::withMessages([
                'house' => ['Rumah tidak bisa dihapus karena masih memiliki penghuni aktif.'],
            ]);
        }

        if ($house->bills()->exists()) {
            throw ValidationException::withMessages([
                'house' => ['Rumah tidak bisa dihapus karena memiliki histori transaksi.'],
            ]);
        }

        $house->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return House::whereIn('id', $ids)
            ->whereDoesntHave('bills')
            ->whereDoesntHave('houseResidents', function ($query) {
                $query->whereNull('end_date');
            })
            ->pluck('id');
    }

    public function assignResident(House $house, int $residentId, string $startDate, ?string $endDate): HouseResident
    {
        $house->houseResidents()->whereNull('end_date')->update(['end_date' => $startDate]);

        $houseResident = $house->houseResidents()->create([
            'resident_id' => $residentId,
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);

        $house->update(['status' => 'dihuni']);

        $resident = Resident::find($residentId);
        ActivityLog::record(
            'assigned',
            "Menempatkan penghuni {$resident?->full_name} ke rumah {$house->house_number}",
            $house
        );

        return $houseResident;
    }

    public function vacateResident(House $house, ?string $endDate): void
    {
        $activeAssignment = $house->houseResidents()->whereNull('end_date')->first();

        if (! $activeAssignment) {
            throw ValidationException::withMessages([
                'house' => ['Rumah ini tidak memiliki penghuni aktif.'],
            ]);
        }

        $activeAssignment->update(['end_date' => $endDate ?? now()->toDateString()]);

        $house->update(['status' => 'kosong']);

        $resident = $activeAssignment->resident;
        ActivityLog::record(
            'vacated',
            "Mencopot penghuni {$resident?->full_name} dari rumah {$house->house_number}",
            $house
        );
    }
}
