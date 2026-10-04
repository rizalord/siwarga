<?php

namespace App\Models;

use Database\Factories\HouseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class House extends Model
{
    /** @use HasFactory<HouseFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['house_number', 'address', 'status'];

    protected function casts(): array
    {
        return ['status' => 'string'];
    }

    /**
     * @return BelongsToMany<Resident, $this>
     */
    public function residents(): BelongsToMany
    {
        return $this->belongsToMany(Resident::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->withTimestamps()
            ->withTrashed();
    }

    /**
     * @return BelongsToMany<Resident, $this>
     */
    public function currentResident(): BelongsToMany
    {
        return $this->belongsToMany(Resident::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->wherePivotNull('end_date')
            ->withTrashed();
    }

    /**
     * @return HasMany<HouseResident, $this>
     */
    public function houseResidents(): HasMany
    {
        return $this->hasMany(HouseResident::class);
    }

    /**
     * @return HasMany<Bill, $this>
     */
    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    protected static function booted(): void
    {
        static::saved(function (House $house) {
            $hasActiveResident = $house->houseResidents()
                ->whereNull('end_date')
                ->exists();

            $correctStatus = $hasActiveResident ? 'dihuni' : 'kosong';

            if ($house->status !== $correctStatus) {
                House::withoutEvents(function () use ($house, $correctStatus) {
                    $house->updateQuietly(['status' => $correctStatus]);
                });
            }
        });
    }
}
