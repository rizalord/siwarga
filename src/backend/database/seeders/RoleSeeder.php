<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Requires PermissionSeeder to have run first.
     */
    public function run(): void
    {
        $admin = Role::create(['name' => 'admin', 'description' => 'Administrator']);
        $bendahara = Role::create(['name' => 'bendahara', 'description' => 'Bendahara']);
        $warga = Role::create(['name' => 'warga', 'description' => 'Warga']);

        // Admin gets all permissions
        $admin->permissions()->attach(Permission::all()->pluck('id'));

        // Bendahara gets financial permissions
        $bendahara->permissions()->attach(Permission::whereIn('name', [
            'houses.view', 'bills.view', 'bills.generate', 'payments.view', 'payments.create',
            'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'reports.view',
        ])->pluck('id'));

        // Warga gets view-only
        $warga->permissions()->attach(Permission::whereIn('name', [
            'bills.view', 'payments.view',
        ])->pluck('id'));
    }
}
