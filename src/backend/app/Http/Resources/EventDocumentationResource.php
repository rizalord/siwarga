<?php

namespace App\Http\Resources;

use App\Models\EventDocumentation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin EventDocumentation
 */
class EventDocumentationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'media_type' => $this->media_type,
            'url' => Storage::url($this->file_path),
            'caption' => $this->caption,
            'created_at' => $this->created_at,
        ];
    }
}
