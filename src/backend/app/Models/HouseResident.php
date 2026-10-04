<?php

namespace App\Models;

use Database\Factories\HouseResidentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HouseResident extends Model
{
    /** @use HasFactory<HouseResidentFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['house_id', 'resident_id', 'start_date', 'end_date'];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (HouseResident $houseResident) {
            $houseResident->house?->save();
        });
        static::deleted(function (HouseResident $houseResident) {
            $houseResident->house?->save();
        });
    }

    /**
     * @return BelongsTo<House, $this>
     */
    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }

    /**
     * @return BelongsTo<Resident, $this>
     */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class)->withTrashed();
    }
}
