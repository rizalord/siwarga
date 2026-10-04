<?php

namespace App\Payments;

use App\Models\PaymentTransaction;
use App\Services\ConfigValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class XenditProvider implements PaymentProvider
{
    public function key(): string
    {
        return 'xendit';
    }

    public function createInvoice(PaymentTransaction $transaction): ProviderInvoice
    {
        if (! in_array($transaction->channel, ['qris', 'va'], true)) {
            throw ValidationException::withMessages(['channel' => ['Kanal belum didukung provider ini.']]);
        }

        $base = rtrim(ConfigValue::string('services.xendit.base_url', 'https://api.xendit.co'), '/');

        $payload = [
            'external_id' => $transaction->idempotency_key,
            'amount' => (float) $transaction->amount,
            'description' => "SIWarga tagihan #{$transaction->bill_id}",
        ];

        if ($transaction->channel === 'qris') {
            $response = Http::withBasicAuth(ConfigValue::string('services.xendit.secret_key'), '')
                ->post("{$base}/qr_codes", [
                    'external_id' => $transaction->idempotency_key,
                    'type' => 'DYNAMIC',
                    'callback_url' => route('payments.webhook', ['provider' => 'xendit']),
                    'amount' => (float) $transaction->amount,
                ])->throw()->json();
            $data = is_array($response) ? $response : [];

            return new ProviderInvoice(
                reference: self::field($data, 'id') ?? $transaction->idempotency_key,
                qrPayload: self::field($data, 'qr_string') ?? '',
                expiresAt: ($expiresAt = self::field($data, 'expires_at')) !== null ? new \DateTimeImmutable($expiresAt) : now()->addMinutes(30),
            );
        }

        $bankCode = $transaction->getAttribute('bank_code');

        if (! is_string($bankCode) || $bankCode === '') {
            throw ValidationException::withMessages(['bank_code' => ['Kode bank wajib diisi untuk kanal VA.']]);
        }

        $response = Http::withBasicAuth(ConfigValue::string('services.xendit.secret_key'), '')
            ->post("{$base}/callback_virtual_accounts", [
                'external_id' => $transaction->idempotency_key,
                'bank_code' => $bankCode,
                'name' => 'SIWarga',
                ...$payload,
            ])->throw()->json();
        $data = is_array($response) ? $response : [];

        return new ProviderInvoice(
            reference: self::field($data, 'id') ?? $transaction->idempotency_key,
            payCode: self::field($data, 'account_number') ?? '',
            expiresAt: ($expiresAt = self::field($data, 'expiration_date')) !== null ? new \DateTimeImmutable($expiresAt) : now()->addHours(24),
        );
    }

    public function parseWebhook(Request $request): ProviderWebhook
    {
        $status = strtolower($request->string('status')->toString());
        $reference = $request->input('qr_code_id', $request->input('callback_virtual_account_id', $request->input('external_id')));

        return new ProviderWebhook(
            reference: is_scalar($reference) ? (string) $reference : '',
            status: in_array($status, ['paid', 'completed', 'success'], true) ? 'paid' : $status,
            raw: $request->all(),
        );
    }

    public function verifySignature(Request $request): bool
    {
        $expected = ConfigValue::string('services.xendit.callback_token');

        return $expected !== '' && hash_equals($expected, (string) $request->header('x-callback-token'));
    }

    /**
     * A scalar field from a decoded provider response, as string.
     *
     * @param  array<mixed>  $data
     */
    private static function field(array $data, string $key): ?string
    {
        $value = $data[$key] ?? null;

        return is_scalar($value) ? (string) $value : null;
    }
}
