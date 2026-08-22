<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PublicEventDocumentationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'media_type' => $this->media_type,
            'file_url' => Storage::disk('public')->url($this->file_path),
            'caption' => $this->caption,
        ];
    }
}
