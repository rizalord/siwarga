<?php

namespace App\Services;

use App\Models\Resident;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ResidentService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?UploadedFile $ktpPhoto): Resident
    {
        if ($ktpPhoto !== null) {
            $data['ktp_photo_path'] = $ktpPhoto->store('ktp-photos', 'public');
        }

        return Resident::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Resident $resident, array $data, ?UploadedFile $ktpPhoto): Resident
    {
        if ($ktpPhoto !== null) {
            $data['ktp_photo_path'] = $ktpPhoto->store('ktp-photos', 'public');
        }

        $resident->update($data);

        return $resident;
    }

    public function delete(Resident $resident): void
    {
        if ($resident->activeHouse()->exists()) {
            throw ValidationException::withMessages([
                'resident' => ['Penghuni tidak bisa dihapus karena masih ditempatkan di sebuah rumah. Kosongkan rumah terlebih dahulu.'],
            ]);
        }

        $resident->delete();
    }

    /**
     * @param  array<int, int>  $ids
     * @return Collection<int, int>
     */
    public function deletableIds(array $ids): Collection
    {
        return Resident::whereIn('id', $ids)
            ->whereDoesntHave('activeHouse')
            ->pluck('id');
    }
}
