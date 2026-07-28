<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'residents.view', 'description' => 'Lihat data penghuni'],
            ['name' => 'residents.create', 'description' => 'Tambah penghuni'],
            ['name' => 'residents.edit', 'description' => 'Ubah penghuni'],
            ['name' => 'residents.delete', 'description' => 'Hapus penghuni'],
            ['name' => 'houses.view', 'description' => 'Lihat data rumah'],
            ['name' => 'houses.create', 'description' => 'Tambah rumah'],
            ['name' => 'houses.edit', 'description' => 'Ubah rumah'],
            ['name' => 'houses.delete', 'description' => 'Hapus rumah'],
            ['name' => 'houses.assign', 'description' => 'Assign penghuni ke rumah'],
            ['name' => 'due-types.view', 'description' => 'Lihat jenis iuran'],
            ['name' => 'due-types.manage', 'description' => 'Kelola jenis iuran'],
            ['name' => 'bills.view', 'description' => 'Lihat tagihan'],
            ['name' => 'bills.generate', 'description' => 'Generate tagihan'],
            ['name' => 'payments.view', 'description' => 'Lihat pembayaran'],
            ['name' => 'payments.create', 'description' => 'Catat pembayaran'],
            ['name' => 'expenses.view', 'description' => 'Lihat pengeluaran'],
            ['name' => 'expenses.create', 'description' => 'Catat pengeluaran'],
            ['name' => 'expenses.edit', 'description' => 'Ubah pengeluaran'],
            ['name' => 'expenses.delete', 'description' => 'Hapus pengeluaran'],
            ['name' => 'reports.view', 'description' => 'Lihat laporan'],
            ['name' => 'users.view', 'description' => 'Lihat data user'],
            ['name' => 'users.manage', 'description' => 'Kelola user'],
        ];

        foreach ($permissions as $permission) {
            Permission::create($permission);
        }
    }
}
