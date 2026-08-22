<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    public $timestamps = false;

    protected $fillable = ['name', 'description'];

    protected $appends = ['is_system'];

    /**
     * Permissions the application's Gates/Policies rely on by name.
     * These cannot be renamed or deleted through the API, since doing so
     * would silently strip that ability from every role that has it.
     *
     * @var array<string, string>
     */
    public const SYSTEM_PERMISSIONS = [
        'residents.view' => 'Lihat data penghuni',
        'residents.create' => 'Tambah penghuni',
        'residents.edit' => 'Ubah penghuni',
        'residents.delete' => 'Hapus penghuni',
        'residents.trash' => 'Kelola data penghuni terhapus',
        'houses.view' => 'Lihat data rumah',
        'houses.create' => 'Tambah rumah',
        'houses.edit' => 'Ubah rumah',
        'houses.delete' => 'Hapus rumah',
        'houses.trash' => 'Kelola data rumah terhapus',
        'houses.assign' => 'Assign penghuni ke rumah',
        'pages.manage' => 'Kelola halaman landing (Beranda, Profil Komplek, Kontak)',
        'due-types.view' => 'Lihat jenis iuran',
        'due-types.manage' => 'Kelola jenis iuran',
        'due-types.trash' => 'Kelola data jenis iuran terhapus',
        'bills.view' => 'Lihat tagihan',
        'bills.view.all' => 'Lihat semua tagihan',
        'bills.view.own' => 'Lihat tagihan sendiri',
        'bills.generate' => 'Generate tagihan',
        'bills.trash' => 'Kelola data tagihan terhapus',
        'payments.view' => 'Lihat pembayaran',
        'payments.view.all' => 'Lihat semua pembayaran',
        'payments.view.own' => 'Lihat pembayaran sendiri',
        'payments.create' => 'Catat pembayaran',
        'payments.trash' => 'Kelola data pembayaran terhapus',
        'expenses.view' => 'Lihat pengeluaran',
        'expenses.create' => 'Catat pengeluaran',
        'expenses.edit' => 'Ubah pengeluaran',
        'expenses.delete' => 'Hapus pengeluaran',
        'expenses.trash' => 'Kelola data pengeluaran terhapus',
        'expense-categories.view' => 'Lihat kategori pengeluaran',
        'expense-categories.manage' => 'Kelola kategori pengeluaran',
        'expense-categories.trash' => 'Kelola data kategori pengeluaran terhapus',
        'reports.view' => 'Lihat laporan',
        'users.view' => 'Lihat data user',
        'users.manage' => 'Kelola user',
        'users.trash' => 'Kelola data user terhapus',
        'activity-logs.view' => 'Lihat log aktivitas',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }

    public function isSystem(): bool
    {
        return array_key_exists($this->name, self::SYSTEM_PERMISSIONS);
    }

    protected function getIsSystemAttribute(): bool
    {
        return $this->isSystem();
    }
}
