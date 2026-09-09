<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Notifications\PaymentSettled;
use App\Payments\PaymentProviderRegistry;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentTransactionService
{
    public function __construct(
        private PaymentService $paymentService,
        private HtmlSanitizer $htmlSanitizer,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createOnline(Bill $bill, array $data, User $user): PaymentTransaction
    {
        if ($bill->status === 'lunas') {
            throw ValidationException::withMessages(['bill_id' => ['Tagihan ini sudah lunas.']]);
        }

        if (($data['channel'] ?? null) === 'manual_transfer') {
            return PaymentTransaction::create([
                'bill_id' => $bill->id,
                'user_id' => $user->id,
                'provider' => 'manual',
                'channel' => 'manual_transfer',
                'amount' => $bill->amount_due,
                'status' => PaymentTransaction::STATUS_PENDING,
                'reference' => 'MAN-'.Str::upper(Str::random(10)),
                'idempotency_key' => (string) Str::uuid(),
            ])->fresh(['bill', 'payer']);
        }

        $providerKey = $data['provider'] ?? (string) config('services.payments.provider', 'simulator');
        $provider = PaymentProviderRegistry::for($providerKey);

        $transaction = PaymentTransaction::create([
            'bill_id' => $bill->id,
            'user_id' => $user->id,
            'provider' => $provider->key(),
            'channel' => $data['channel'],
            'amount' => $bill->amount_due,
            'status' => PaymentTransaction::STATUS_PENDING,
            'reference' => 'TMP-'.Str::upper(Str::random(10)),
            'idempotency_key' => (string) Str::uuid(),
        ]);

        // bank_code is validated at the controller (required_if va) and passed
        // as an in-memory transient only — never persisted to the transactions table.
        $freshTransaction = $transaction->fresh();
        $freshTransaction->setAttribute('bank_code', $data['bank_code'] ?? null);

        $invoice = $provider->createInvoice($freshTransaction);

        $transaction->update([
            'reference' => $invoice->reference,
            'pay_code' => $invoice->payCode ?? $invoice->qrPayload,
            'expires_at' => $invoice->expiresAt,
        ]);

        return $transaction->fresh(['bill', 'payer']);
    }

    public function uploadProof(PaymentTransaction $transaction, UploadedFile $file, User $user): PaymentTransaction
    {
        if (! in_array($transaction->status, [PaymentTransaction::STATUS_PENDING], true)) {
            throw ValidationException::withMessages(['status' => ['Transaksi ini tidak bisa dilengkapi bukti.']]);
        }

        if ($transaction->proof_path !== null) {
            Storage::disk('public')->delete($transaction->proof_path);
        }

        $transaction->update([
            'channel' => 'manual_transfer',
            'provider' => 'manual',
            'proof_path' => $file->store('payment-proofs', 'public'),
            'status' => PaymentTransaction::STATUS_AWAITING_VERIFICATION,
        ]);

        return $transaction->fresh(['bill', 'payer']);
    }

    public function verify(PaymentTransaction $transaction, bool $approve, ?string $reason, User $actor): PaymentTransaction
    {
        if ($transaction->status !== PaymentTransaction::STATUS_AWAITING_VERIFICATION) {
            throw ValidationException::withMessages(['status' => ['Hanya transaksi menunggu verifikasi yang bisa diverifikasi.']]);
        }

        if (! $approve && blank($reason)) {
            throw ValidationException::withMessages(['reason' => ['Alasan penolakan wajib diisi.']]);
        }

        if ($approve) {
            return $this->finalizePaid($transaction, $actor->name, $actor);
        }

        $transaction->update([
            'status' => PaymentTransaction::STATUS_REJECTED,
            'verified_by' => $actor->id,
            'verified_at' => now(),
            'rejection_reason' => $this->htmlSanitizer->sanitize($reason),
        ]);

        $this->notify($transaction->fresh('payer'), PaymentTransaction::STATUS_AWAITING_VERIFICATION, PaymentTransaction::STATUS_REJECTED, $actor->name);

        return $transaction->fresh(['bill', 'payer', 'verifier']);
    }

    public function handleWebhook(string $providerKey, Request $request): PaymentTransaction
    {
        abort_unless($providerKey !== 'simulator' || app()->environment('local', 'testing'), 403, 'Webhook simulator hanya tersedia di lingkungan lokal/pengujian.');

        $provider = PaymentProviderRegistry::for($providerKey);

        if (! $provider->verifySignature($request)) {
            abort(403, 'Invalid webhook signature.');
        }

        $webhook = $provider->parseWebhook($request);

        $transaction = PaymentTransaction::where('reference', $webhook->reference)->firstOrFail();

        // Settled transactions are immutable: late non-paid webhooks are a no-op.
        if ($transaction->status === PaymentTransaction::STATUS_PAID) {
            return $transaction->fresh(['bill', 'payer']);
        }

        if ($webhook->status !== 'paid') {
            $transaction->update(['status' => $webhook->status === 'expired' ? PaymentTransaction::STATUS_EXPIRED : PaymentTransaction::STATUS_FAILED]);

            return $transaction->fresh(['bill', 'payer']);
        }

        return $this->finalizePaid($transaction, $provider->key());
    }

    public function simulatePay(PaymentTransaction $transaction, User $actor): PaymentTransaction
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');

        return $this->finalizePaid($transaction, $actor->name.' (simulasi)');
    }

    private function finalizePaid(PaymentTransaction $transaction, string $actorName, ?User $verifier = null): PaymentTransaction
    {
        return DB::transaction(function () use ($transaction, $actorName, $verifier): PaymentTransaction {
            $fresh = PaymentTransaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();

            // Idempotency: replayed webhooks / double taps are a no-op.
            if ($fresh->status === PaymentTransaction::STATUS_PAID) {
                return $fresh->load(['bill', 'payer', 'verifier']);
            }

            if (! in_array($fresh->status, [PaymentTransaction::STATUS_PENDING, PaymentTransaction::STATUS_AWAITING_VERIFICATION], true)) {
                throw ValidationException::withMessages(['status' => ['Transaksi ini tidak bisa dibayar.']]);
            }

            $bill = Bill::whereKey($fresh->bill_id)->lockForUpdate()->firstOrFail();

            if ($bill->status === 'lunas') {
                throw ValidationException::withMessages(['bill_id' => ['Tagihan ini sudah lunas.']]);
            }

            if ($verifier !== null) {
                $fresh->update([
                    'verified_by' => $verifier->id,
                    'verified_at' => now(),
                ]);
            }

            $old = $fresh->status;

            $this->paymentService->create([
                'bill_id' => $fresh->bill_id,
                'amount_paid' => $fresh->amount,
                'payment_date' => now()->toDateString(),
                'notes' => "Online via {$fresh->provider}/{$fresh->channel} ref {$fresh->reference}",
            ], $fresh->user_id);

            $fresh->update(['status' => PaymentTransaction::STATUS_PAID, 'paid_at' => now()]);

            $result = $fresh->fresh(['bill', 'payer', 'verifier']);

            try {
                $result->payer?->notify(new PaymentSettled(
                    $result->id, $old, PaymentTransaction::STATUS_PAID, $actorName, (float) $result->amount,
                ));
            } catch (\Throwable $exception) {
                Log::warning('PaymentTransactionService: failed to store settle notification', [
                    'transaction_id' => $result->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            return $result;
        });
    }

    private function notify(PaymentTransaction $transaction, string $old, string $new, string $actorName): void
    {
        try {
            $transaction->payer?->notify(new PaymentSettled(
                $transaction->id, $old, $new, $actorName, (float) $transaction->amount,
            ));
        } catch (\Throwable $exception) {
            Log::warning('PaymentTransactionService: failed to store notification', [
                'transaction_id' => $transaction->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
