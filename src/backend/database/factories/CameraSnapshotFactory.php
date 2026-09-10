<?php

namespace Database\Factories;

use App\Models\Camera;
use App\Models\CameraSnapshot;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CameraSnapshot>
 */
class CameraSnapshotFactory extends Factory
{
    protected $model = CameraSnapshot::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'camera_id' => Camera::factory(),
            'file_path' => 'camera-snapshots/1/dummy.jpg',
            'mime' => 'image/jpeg',
            'size_bytes' => 1024,
            'event_type' => CameraSnapshot::EVENT_MOTION,
            'captured_at' => now(),
            'source_hash' => hash('sha256', Str::random(16)),
        ];
    }
}
