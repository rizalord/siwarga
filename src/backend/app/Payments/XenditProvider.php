<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class XenditProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'xendit';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        $base = rtrim((string) config('services.xendit.base_url', 'https://api.xendit.co'), '/');

        $payload = [
            'external_id' => $transaction->idempotency_key,
            'amount' => (float) $transaction->amount,
            'description' => "SIWarga tagihan #{$transaction->bill_id}",
        ];

        if ($transaction->channel === 'qris') {
            $response = Http::withToken((string) config('services.xendit.secret_key'))
                ->post("{$base}/qr_codes", [
                    'external_id' => $transaction->idempotency_key,
                    'type' => 'DYNAMIC',
                    'callback_url' => route('payments.webhook', ['provider' => 'xendit']),
                    'amount' => (float) $transaction->amount,
                ])->throw()->json();

            return new ProviderInvoice(
                reference: (string) ($response['id'] ?? $transaction->idempotency_key),
                qrPayload: (string) ($response['qr_string'] ?? ''),
                expiresAt: isset($response['expires_at']) ? new \DateTimeImmutable($response['expires_at']) : now()->addMinutes(30),
            );
        }

        $response = Http::withToken((string) config('services.xendit.secret_key'))
            ->post("{$base}/callback_virtual_accounts", [
                'external_id' => $transaction->idempotency_key,
                'bank_code' => 'BRI',
                'name' => 'SIWarga',
                ...$payload,
            ])->throw()->json();

        return new ProviderInvoice(
            reference: (string) ($response['id'] ?? $transaction->idempotency_key),
            payCode: (string) ($response['account_number'] ?? ''),
            expiresAt: isset($response['expiration_date']) ? new \DateTimeImmutable($response['expiration_date']) : now()->addHours(24),
        );
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        $status = strtolower((string) $request->input('status', ''));

        return new ProviderWebhook(
            reference: (string) ($request->input('qr_code_id', $request->input('callback_virtual_account_id', $request->input('external_id')))),
            status: in_array($status, ['paid', 'completed', 'success'], true) ? 'paid' : $status,
            raw: $request->all(),
        );
    }

    public function verifySignature(Request $request): bool
    {
        $expected = (string) config('services.xendit.callback_token');

        return $expected !== '' && hash_equals($expected, (string) $request->header('x-callback-token'));
    }
}
