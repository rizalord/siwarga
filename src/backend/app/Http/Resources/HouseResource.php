<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'house_number' => $this->house_number,
            'address' => $this->address,
            'status' => $this->status,
            'current_resident' => $this->whenLoaded('currentResident', fn () => $this->currentResident->first()
                ? new ResidentResource($this->currentResident->first())
                : null
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
