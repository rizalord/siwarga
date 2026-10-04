<?php

namespace App\Models;

use Database\Factories\BillFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read string|float|null $total_paid Aggregate from withSum/loadSum('payments as total_paid', 'amount_paid').
 */
class Bill extends Model
{
    /** @use HasFactory<BillFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'house_id', 'resident_id', 'due_type_id',
        'period_start', 'period_end', 'amount_due',
        'status', 'generated_at', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'generated_at' => 'datetime',
            'amount_due' => 'decimal:2',
            'status' => 'string',
        ];
    }

    /**
     * @return BelongsTo<House, $this>
     */
    public function house(): BelongsTo
    {
        return $this->belongsTo(House::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Resident, $this>
     */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class)->withTrashed();
    }

    /**
     * @return BelongsTo<DueType, $this>
     */
    public function dueType(): BelongsTo
    {
        return $this->belongsTo(DueType::class)->withTrashed();
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by')->withTrashed();
    }
}
