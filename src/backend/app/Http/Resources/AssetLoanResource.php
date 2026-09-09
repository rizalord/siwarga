<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetLoanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'asset_name' => $this->asset?->name,
            'borrowed_by' => $this->borrowed_by,
            'borrower_name' => $this->borrower?->name,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'borrowed_at' => $this->borrowed_at,
            'returned_at' => $this->returned_at,
            'created_at' => $this->created_at,
        ];
    }
}
