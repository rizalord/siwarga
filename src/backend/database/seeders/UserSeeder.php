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
        $adminRoleId = Role::where('name', 'admin')->first()->id;
        $bendaharaRoleId = Role::where('name', 'bendahara')->first()->id;
        $wargaRoleId = Role::where('name', 'warga')->first()->id;

        $admin = User::updateOrCreate(
            ['email' => 'admin@siwarga.test'],
            [
                'name' => 'Admin RT',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $admin->roles()->syncWithoutDetaching([$adminRoleId]);

        $bendahara = User::updateOrCreate(
            ['email' => 'bendahara@siwarga.test'],
            [
                'name' => 'Bendahara RT',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $bendahara->roles()->syncWithoutDetaching([$bendaharaRoleId]);

        // User warga demo — terhubung ke penghuni rumah pertama agar bisa login & lihat tagihan miliknya
        $firstHouseResident = HouseResident::whereNull('end_date')->first();
        if ($firstHouseResident) {
            $warga = User::updateOrCreate(
                ['email' => 'warga@siwarga.test'],
                [
                    'name' => $firstHouseResident->resident->full_name,
                    'password' => bcrypt('password'),
                    'resident_id' => $firstHouseResident->resident_id,
                    'is_active' => true,
                ]
            );
            $warga->roles()->syncWithoutDetaching([$wargaRoleId]);
        }
    }
}
