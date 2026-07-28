<?php

namespace Database\Seeders;

use App\Models\HouseResident;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Requires RoleSeeder (and ResidentSeeder for the warga login) to have run first.
     */
    public function run(): void
    {
        $admin = User::create([
            'name' => 'Admin RT',
            'email' => 'admin@siwarga.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $admin->roles()->attach(Role::where('name', 'admin')->first()->id);

        $bendahara = User::create([
            'name' => 'Bendahara RT',
            'email' => 'bendahara@siwarga.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);
        $bendahara->roles()->attach(Role::where('name', 'bendahara')->first()->id);

        // User warga demo — terhubung ke penghuni rumah pertama agar bisa login & lihat tagihan miliknya
        $firstHouseResident = HouseResident::whereNull('end_date')->first();
        if ($firstHouseResident) {
            $warga = User::create([
                'name' => $firstHouseResident->resident->full_name,
                'email' => 'warga@siwarga.test',
                'password' => bcrypt('password'),
                'resident_id' => $firstHouseResident->resident_id,
                'is_active' => true,
            ]);
            $warga->roles()->attach(Role::where('name', 'warga')->first()->id);
        }
    }
}
