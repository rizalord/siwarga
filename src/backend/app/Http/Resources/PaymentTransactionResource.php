<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bill_id' => $this->bill_id,
            'bill_label' => trim(($this->bill?->dueType?->name ?? '').' '.($this->bill?->period_start?->format('M Y') ?? '')),
            'user_id' => $this->user_id,
            'payer_name' => $this->payer?->name,
            'provider' => $this->provider,
            'channel' => $this->channel,
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'reference' => $this->reference,
            'pay_code' => $this->pay_code,
            'qr_payload' => $this->channel === 'qris' ? $this->pay_code : null,
            'expires_at' => $this->expires_at,
            'proof_path' => $this->proof_path,
            'verified_by' => $this->verified_by,
            'rejection_reason' => $this->rejection_reason,
            'paid_at' => $this->paid_at,
            'created_at' => $this->created_at,
        ];
    }
}
