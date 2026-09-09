<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuestLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'guest_name' => $this->guest_name,
            'purpose' => $this->purpose,
            'house_id' => $this->house_id,
            'house_number' => $this->house?->house_number,
            'plate_number' => $this->plate_number,
            'registered_by' => $this->registered_by,
            'registrar_name' => $this->registrar?->name,
            'qr_token' => $this->qr_token,
            'visit_date' => $this->visit_date,
            'status' => $this->status,
            'checked_in_at' => $this->checked_in_at,
            'checked_out_at' => $this->checked_out_at,
            'recorded_by' => $this->recorded_by,
            'created_at' => $this->created_at,
        ];
    }
}
