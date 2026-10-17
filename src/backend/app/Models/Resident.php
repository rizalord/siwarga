<?php

namespace App\Models;

use Database\Factories\ResidentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Resident extends Model
{
    /** @use HasFactory<ResidentFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'full_name', 'ktp_photo_path', 'status',
        'phone_number', 'marital_status',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'marital_status' => 'string',
        ];
    }

    /**
     * @return BelongsToMany<House, $this>
     */
    public function houses(): BelongsToMany
    {
        return $this->belongsToMany(House::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->withTimestamps();
    }

    /**
     * @return BelongsToMany<House, $this>
     */
    public function activeHouse(): BelongsToMany
    {
        return $this->belongsToMany(House::class, 'house_residents')
            ->withPivot(['start_date', 'end_date'])
            ->wherePivotNull('end_date');
    }
}
