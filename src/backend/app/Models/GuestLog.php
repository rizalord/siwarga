<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class GuestLog extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_REGISTERED = 'registered';

    public const STATUS_CHECKED_IN = 'checked_in';

    public const STATUS_CHECKED_OUT = 'checked_out';

    protected $fillable = [
        'guest_name', 'purpose', 'house_id', 'plate_number',
        'registered_by', 'qr_token', 'visit_date', 'status',
        'checked_in_at', 'checked_out_at', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
        ];
    }

    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class);
    }

    public function registrar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
