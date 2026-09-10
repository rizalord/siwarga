<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Camera extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_TAPO = 'tapo';

    public const TYPE_SIMULATOR = 'simulator';

    protected $fillable = [
        'name', 'location', 'ftp_user', 'camera_type', 'stream_url', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(CameraSnapshot::class);
    }
}
