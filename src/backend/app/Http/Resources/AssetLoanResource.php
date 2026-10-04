<?php

namespace App\Http\Resources;

use App\Models\AssetLoan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AssetLoan
 */
class AssetLoanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
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
