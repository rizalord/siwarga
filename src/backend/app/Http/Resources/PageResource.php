<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'content' => $this->content,
            'hero_image_url' => $this->hero_image ? Storage::disk('public')->url($this->hero_image) : null,
            'updated_by' => $this->updated_by,
            'updated_at' => $this->updated_at,
        ];
    }
}
