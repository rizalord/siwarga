<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CameraResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'ftp_user' => $this->ftp_user,
            'camera_type' => $this->camera_type,
            'stream_url' => $this->stream_url,
            'is_active' => $this->is_active,
            'snapshots_count' => $this->whenCounted('snapshots'),
            'created_at' => $this->created_at,
        ];
    }
}
