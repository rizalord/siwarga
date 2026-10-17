<?php

namespace App\Models;

use Database\Factories\PatrolScheduleFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatrolSchedule extends Model
{
    /** @use HasFactory<PatrolScheduleFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = ['date', 'shift', 'personnel_name', 'user_id', 'area', 'note'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function personnel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
