<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'facility_id' => $this->facility_id,
            'facility_name' => $this->facility?->name,
            'booked_by' => $this->booked_by,
            'booker_name' => $this->booker?->name,
            'event_id' => $this->event_id,
            'start_at' => $this->start_at,
            'end_at' => $this->end_at,
            'status' => $this->status,
            'approved_by' => $this->approved_by,
            'created_at' => $this->created_at,
        ];
    }
}
