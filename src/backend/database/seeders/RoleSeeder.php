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
        $admin = Role::updateOrCreate(
            ['name' => 'admin'],
            ['description' => 'Administrator']
        );
        $bendahara = Role::updateOrCreate(
            ['name' => 'bendahara'],
            ['description' => 'Bendahara']
        );
        $warga = Role::updateOrCreate(
            ['name' => 'warga'],
            ['description' => 'Warga']
        );

        // Admin gets all permissions
        $admin->permissions()->sync(Permission::all()->pluck('id'));

        // Bendahara manages finance, but cannot change master data rumah/penghuni.
        $bendahara->permissions()->sync(Permission::whereIn('name', [
            'houses.view',
            'bills.view', 'bills.view.all', 'bills.generate', 'bills.trash',
            'payments.view', 'payments.view.all', 'payments.create', 'payments.trash',
            'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.trash',
            'expense-categories.view', 'expense-categories.manage', 'expense-categories.trash',
            'reports.view',
            'announcements.manage', 'announcements.view',
            'polls.view', 'forum.view',
        ])->pluck('id'));

        // Warga can only view bills/payments within their own resident scope.
        $warga->permissions()->sync(Permission::whereIn('name', [
            'bills.view', 'bills.view.own', 'payments.view', 'payments.view.own',
            'announcements.view',
            'polls.view', 'polls.vote', 'forum.view',
            'tickets.view', 'tickets.create', 'suggestions.create',
        ])->pluck('id'));
    }
}
