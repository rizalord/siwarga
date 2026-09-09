<?php

namespace App\Payments;

class ProviderInvoice
{
    public function __construct(
        public string $reference,
        public ?string $payCode = null,
        public ?string $qrPayload = null,
        public ?\DateTimeInterface $expiresAt = null,
    ) {}
}
