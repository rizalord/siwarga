<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SimulatorProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'simulator';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        return new ProviderInvoice(
            reference: 'SIM-'.Str::upper(Str::random(10)),
            payCode: 'SIMULATOR-'.$transaction->id,
            qrPayload: 'SIMULATOR:'.$transaction->id.':'.$transaction->amount,
            expiresAt: now()->addMinutes(30),
        );
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        return new ProviderWebhook(
            reference: (string) $request->input('reference'),
            status: (string) $request->input('status', ''),
            raw: $request->all(),
        );
    }

    public function verifySignature(Request $request): bool
    {
        return true;
    }
}
