<?php

namespace App\Http\Resources;

use App\Models\EventDocumentation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin EventDocumentation
 */
class PublicEventDocumentationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'media_type' => $this->media_type,
            'file_url' => Storage::disk('public')->url($this->file_path),
            'caption' => $this->caption,
        ];
    }
}
