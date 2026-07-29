<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\DueType;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\House;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ActivityLogObserver
{
    /**
     * Human-readable label and the attribute used to identify a row in log
     * descriptions, keyed by model class.
     *
     * @var array<class-string, array{label: string, name: string}>
     */
    private const SUBJECT_META = [
        Resident::class => ['label' => 'Penghuni', 'name' => 'full_name'],
        House::class => ['label' => 'Rumah', 'name' => 'house_number'],
        DueType::class => ['label' => 'Jenis Iuran', 'name' => 'name'],
        Bill::class => ['label' => 'Tagihan', 'name' => 'id'],
        Payment::class => ['label' => 'Pembayaran', 'name' => 'id'],
        Expense::class => ['label' => 'Pengeluaran', 'name' => 'description'],
        ExpenseCategory::class => ['label' => 'Kategori Pengeluaran', 'name' => 'name'],
        User::class => ['label' => 'User', 'name' => 'name'],
        Role::class => ['label' => 'Role', 'name' => 'name'],
        Permission::class => ['label' => 'Permission', 'name' => 'name'],
    ];

    public function created(Model $model): void
    {
        [$label, $identifier] = $this->describe($model);

        ActivityLog::record(
            'created',
            "Menambahkan {$label}: {$identifier}",
            $model,
            $this->withoutTimestamps($model->getAttributes())
        );
    }

    public function updated(Model $model): void
    {
        $changes = $this->withoutTimestamps($model->getChanges());

        if (empty($changes)) {
            return;
        }

        [$label, $identifier] = $this->describe($model);

        ActivityLog::record(
            'updated',
            "Mengubah {$label}: {$identifier}",
            $model,
            [
                'before' => array_intersect_key($model->getOriginal(), $changes),
                'after' => $changes,
            ]
        );
    }

    public function deleted(Model $model): void
    {
        [$label, $identifier] = $this->describe($model);

        ActivityLog::record('deleted', "Menghapus {$label}: {$identifier}", $model);
    }

    public function restored(Model $model): void
    {
        [$label, $identifier] = $this->describe($model);

        ActivityLog::record('restored', "Memulihkan {$label}: {$identifier}", $model);
    }

    public function forceDeleted(Model $model): void
    {
        [$label, $identifier] = $this->describe($model);

        ActivityLog::record('force_deleted', "Menghapus permanen {$label}: {$identifier}", $model);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function describe(Model $model): array
    {
        $meta = self::SUBJECT_META[$model::class] ?? ['label' => class_basename($model), 'name' => 'id'];

        return [$meta['label'], (string) ($model->{$meta['name']} ?? $model->getKey())];
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withoutTimestamps(array $attributes): array
    {
        return array_diff_key($attributes, array_flip(['created_at', 'updated_at', 'deleted_at']));
    }
}
