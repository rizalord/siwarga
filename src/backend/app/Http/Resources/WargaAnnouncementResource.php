<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WargaAnnouncementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $read = $this->reads->first();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'content' => $this->content,
            'category' => $this->category,
            'published_at' => $this->published_at,
            'is_read' => $read !== null,
            'read_at' => $read?->read_at,
            'created_at' => $this->created_at,
        ];
    }
}
