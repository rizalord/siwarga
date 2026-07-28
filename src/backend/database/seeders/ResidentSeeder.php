<?php

namespace Database\Seeders;

use App\Models\House;
use App\Models\HouseResident;
use App\Models\Resident;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ResidentSeeder extends Seeder
{
    /**
     * Requires HouseSeeder to have run first.
     *
     * 15 rumah tetap dihuni penghuni tetap, 3 dari 5 rumah kontrak/kosong
     * dihuni penghuni kontrak, dan 2 rumah sisanya dibiarkan kosong.
     */
    public function run(): void
    {
        $houses = House::orderBy('house_number')->get();

        $houses->take(15)->each(function (House $house) {
            $resident = Resident::create([
                'full_name' => fake('id_ID')->name(),
                'status' => 'tetap',
                'phone_number' => fake('id_ID')->numerify('08##########'),
                'marital_status' => fake()->randomElement(['menikah', 'belum_menikah']),
            ]);

            HouseResident::create([
                'house_id' => $house->id,
                'resident_id' => $resident->id,
                'start_date' => Carbon::now()->subYear()->startOfYear(),
            ]);
        });

        $houses->slice(15, 3)->each(function (House $house) {
            $resident = Resident::create([
                'full_name' => fake('id_ID')->name(),
                'status' => 'kontrak',
                'phone_number' => fake('id_ID')->numerify('08##########'),
                'marital_status' => fake()->randomElement(['menikah', 'belum_menikah']),
            ]);

            HouseResident::create([
                'house_id' => $house->id,
                'resident_id' => $resident->id,
                'start_date' => Carbon::now()->subMonths(2)->startOfMonth(),
            ]);
        });

        // 2 rumah sisanya dibiarkan kosong (tanpa penghuni aktif)
    }
}
