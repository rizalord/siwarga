<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PollResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'status' => now()->lt($this->starts_at) ? 'upcoming' : (now()->gt($this->ends_at) ? 'ended' : 'ongoing'),
            'options' => $this->options->map(fn ($option) => ['id' => $option->id, 'label' => $option->label])->values(),
            'has_voted' => (bool) ($this->has_voted ?? false),
            'user_voted_option_id' => $this->user_voted_option_id ?? null,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
