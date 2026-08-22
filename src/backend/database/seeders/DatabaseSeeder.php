<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            UserSeeder::class,
            PageSeeder::class,

            // Data demo dinonaktifkan agar database awal tetap kosong.
            // DueTypeSeeder::class,
            // HouseSeeder::class,
            // ResidentSeeder::class,
            // BillSeeder::class,
            // PaymentSeeder::class,
            ExpenseCategorySeeder::class,
            // ExpenseSeeder::class,
        ]);
    }
}
