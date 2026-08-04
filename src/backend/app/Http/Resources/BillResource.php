<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'house' => new HouseResource($this->whenLoaded('house')),
            'resident' => new ResidentResource($this->whenLoaded('resident')),
            'due_type' => $this->dueType,
            'period_start' => $this->period_start,
            'period_end' => $this->period_end,
            'amount_due' => (float) $this->amount_due,
            'total_paid' => (float) ($this->total_paid ?? 0),
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
