<?php

namespace App\Payments;

class ProviderWebhook
{
    public function __construct(
        public string $reference,
        public string $status,
        public array $raw = [],
    ) {}
}
