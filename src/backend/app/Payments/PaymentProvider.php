<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;

interface PaymentProvider
{
    public function key(): string;

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice;

    public function parseWebhook(Request $request): ProviderWebhook;

    public function verifySignature(Request $request): bool;
}
