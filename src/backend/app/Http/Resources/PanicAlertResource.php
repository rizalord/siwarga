<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PanicAlertResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reporter_id' => $this->reporter_id,
            'reporter_name' => $this->reporter?->name,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'location_note' => $this->location_note,
            'note' => $this->note,
            'status' => $this->status,
            'handler_id' => $this->handler_id,
            'handler_name' => $this->handler?->name,
            'handled_at' => $this->handled_at,
            'resolved_at' => $this->resolved_at,
            'created_at' => $this->created_at,
        ];
    }
}
