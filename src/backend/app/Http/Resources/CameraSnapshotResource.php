<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CameraSnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'camera_id' => $this->camera_id,
            'camera_name' => $this->camera?->name,
            'file_path' => $this->file_path,
            'file_url' => $this->file_path ? Storage::disk('public')->url($this->file_path) : null,
            'mime' => $this->mime,
            'size_bytes' => $this->size_bytes,
            'event_type' => $this->event_type,
            'captured_at' => $this->captured_at,
            'created_at' => $this->created_at,
        ];
    }
}
