<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;

/**
 * Recipe slot for the next provider (Duitku/Doku/PayPal follow the same shape):
 * 1. Implement createInvoice() against the provider HTTP API.
 * 2. Implement parseWebhook() mapping their payload to reference+status.
 * 3. Implement verifySignature() with their signing scheme.
 * 4. Register key => class in PaymentProviderRegistry::map().
 */
class MidtransProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'midtrans';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }

    public function verifySignature(Request $request): bool
    {
        throw new \LogicException('MidtransProvider belum diimplementasikan. Ikuti recipe di docblock class ini.');
    }
}
