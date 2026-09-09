<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'status' => $this->status,
            'reported_by' => $this->reported_by,
            'reporter_name' => $this->reporter?->name,
            'house_id' => $this->house_id,
            'assigned_to' => $this->assigned_to,
            'assignee_name' => $this->assignee?->name,
            'comments_count' => $this->comments_count ?? $this->comments()->count(),
            'attachments' => TicketAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
