<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bill' => new BillResource($this->whenLoaded('bill')),
            'amount_paid' => (float) $this->amount_paid,
            'payment_date' => $this->payment_date,
            'notes' => $this->notes,
            'created_by' => $this->creator,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
        ];
    }
}
