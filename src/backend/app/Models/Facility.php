<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Facility extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'description', 'rental_fee', 'due_type_id', 'is_active'];

    protected function casts(): array
    {
        return [
            'rental_fee' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(FacilityBooking::class);
    }

    public function dueType(): BelongsTo
    {
        return $this->belongsTo(DueType::class);
    }
}
