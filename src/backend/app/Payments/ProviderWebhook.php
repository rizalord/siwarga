<?php

namespace App\Payments;

class ProviderWebhook
{
    /**
     * @param  array<mixed>  $raw
     */
    public function __construct(
        public string $reference,
        public string $status,
        public array $raw = [],
    ) {}
}
