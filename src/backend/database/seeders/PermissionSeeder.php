<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Permission::SYSTEM_PERMISSIONS as $name => $description) {
            Permission::updateOrCreate(
                ['name' => $name],
                ['description' => $description]
            );
        }
    }
}
