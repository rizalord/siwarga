<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            DueTypeSeeder::class,
        ]);

        // Create default admin user
        $admin = User::create([
            'name' => 'Admin RT',
            'email' => 'admin@siwarga.test',
            'password' => bcrypt('password'),
            'is_active' => true,
        ]);

        $adminRole = Role::where('name', 'admin')->first();
        if ($adminRole) {
            $admin->roles()->attach($adminRole->id);
        }
    }
}
