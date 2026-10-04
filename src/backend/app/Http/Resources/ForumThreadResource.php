<?php

namespace App\Http\Resources;

use App\Models\ForumThread;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ForumThread
 */
class ForumThreadResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'created_by' => $this->created_by,
            'created_by_name' => $this->createdBy?->name,
            'posts_count' => $this->posts_count ?? $this->posts()->count(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
