<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentTransactionResource;
use App\Models\Bill;
use App\Models\PaymentTransaction;
use App\Services\PaymentTransactionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentTransactionController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private PaymentTransactionService $service) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', PaymentTransaction::class);

        $query = PaymentTransaction::with(['bill.dueType', 'payer']);

        if (! $request->user()->hasPermission('payments.view.all')
            && ! $request->user()->hasPermission('payments.verify')) {
            $query->where('user_id', $request->user()->id);
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->filled('bill_id')) {
            $query->where('bill_id', $request->bill_id);
        }

        $this->applySorting($query, $request, ['amount', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PaymentTransactionResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bill_id' => 'required|exists:bills,id',
            'channel' => ['required', Rule::in(['qris', 'va', 'manual_transfer'])],
            'bank_code' => ['required_if:channel,va', 'nullable', 'string', 'max:20'],
            'provider' => ['nullable', Rule::in(['simulator', 'xendit', 'midtrans'])],
            'proof' => 'required_if:channel,manual_transfer|nullable|image|max:2048',
        ], [
            'channel.in' => 'Kanal pembayaran tidak valid.',
            'bank_code.required_if' => 'Kode bank wajib diisi untuk kanal VA.',
        ]);

        $bill = Bill::findOrFail($validated['bill_id']);

        abort_unless(
            $request->user()->hasPermission('payments.view.all')
                || ($request->user()->hasPermission('bills.view.own')
                    && $request->user()->resident_id !== null
                    && $bill->resident_id === $request->user()->resident_id),
            403
        );

        $transaction = $this->service->createOnline($bill, $validated, $request->user());

        if ($request->hasFile('proof')) {
            $transaction = $this->service->uploadProof($transaction, $request->file('proof'), $request->user());
        }

        return (new PaymentTransactionResource($transaction))->response()->setStatusCode(201);
    }

    public function show(Request $request, PaymentTransaction $paymentTransaction)
    {
        $this->authorize('view', $paymentTransaction);

        $paymentTransaction->load(['bill.dueType', 'payer', 'verifier']);

        return new PaymentTransactionResource($paymentTransaction);
    }

    public function proof(Request $request, PaymentTransaction $paymentTransaction)
    {
        abort_unless(
            $request->user()->hasPermission('payments.view.all')
                || ($request->user()->hasPermission('payments.online')
                    && $paymentTransaction->user_id === $request->user()->id),
            403
        );
        abort_unless($paymentTransaction->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'proof' => 'required|image|max:2048',
        ]);

        $transaction = $this->service->uploadProof($paymentTransaction, $validated['proof'], $request->user());

        return new PaymentTransactionResource($transaction);
    }

    public function verify(Request $request, PaymentTransaction $paymentTransaction)
    {
        abort_unless($request->user()->hasPermission('payments.verify'), 403);

        $validated = $request->validate([
            'approve' => 'required|boolean',
            'reason' => 'required_if:approve,false|nullable|string|max:255',
        ]);

        $transaction = $this->service->verify(
            $paymentTransaction,
            (bool) $validated['approve'],
            $validated['reason'] ?? null,
            $request->user()
        );

        return new PaymentTransactionResource($transaction);
    }

    public function simulatePay(Request $request, PaymentTransaction $paymentTransaction)
    {
        abort_unless(
            $request->user()->hasPermission('payments.view.all')
                || ($request->user()->hasPermission('payments.online')
                    && $paymentTransaction->user_id === $request->user()->id),
            403
        );

        return new PaymentTransactionResource($this->service->simulatePay($paymentTransaction, $request->user()));
    }
}
