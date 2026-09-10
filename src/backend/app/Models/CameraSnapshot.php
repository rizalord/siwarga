<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CameraSnapshot extends Model
{
    use HasFactory, SoftDeletes;

    public const EVENT_MOTION = 'motion';

    public const EVENT_PANIC = 'panic';

    public const EVENT_MANUAL = 'manual';

    public const EVENT_SIMULATED = 'simulated';

    protected $fillable = [
        'camera_id', 'file_path', 'mime', 'size_bytes',
        'event_type', 'captured_at', 'source_hash',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'captured_at' => 'datetime',
        ];
    }

    public function camera(): BelongsTo
    {
        return $this->belongsTo(Camera::class);
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(CameraAccessLog::class, 'snapshot_id');
    }
}
