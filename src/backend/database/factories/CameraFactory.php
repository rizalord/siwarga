<?php

namespace Database\Factories;

use App\Models\Camera;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Camera>
 */
class CameraFactory extends Factory
{
    protected $model = Camera::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Kamera Gerbang',
            'location' => 'Gerbang Utama',
            'ftp_user' => strtolower('cam-'.Str::random(8)),
            'camera_type' => Camera::TYPE_TAPO,
            'stream_url' => null,
            'is_active' => true,
        ];
    }
}
