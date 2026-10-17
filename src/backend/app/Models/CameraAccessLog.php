<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CameraAccessLog extends Model
{
    public $timestamps = false;

    protected $fillable = ['snapshot_id', 'user_id', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<CameraSnapshot, $this>
     */
    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(CameraSnapshot::class, 'snapshot_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
