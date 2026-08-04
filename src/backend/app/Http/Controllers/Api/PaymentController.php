<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function index(Request $request)
    {
        $query = Payment::with(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        if (! $request->user()->hasPermission('payments.view.all')) {
            abort_unless(
                $request->user()->hasPermission('payments.view.own')
                    && $request->user()->resident_id !== null,
                403
            );
            $query->whereHas('bill', function ($q) use ($request) {
                $q->where('resident_id', $request->user()->resident_id);
            });
        }

        if ($request->month) {
            $query->whereMonth('payment_date', $request->month);
        }

        if ($request->year) {
            $query->whereYear('payment_date', $request->year);
        }

        if ($request->bill_id) {
            $query->where('bill_id', $request->bill_id);
        }

        if ($request->search) {
            $query->whereHas('bill', function ($q) use ($request) {
                $q->whereHas('resident', function ($r) use ($request) {
                    $r->where('full_name', 'like', "%{$request->search}%");
                })->orWhereHas('house', function ($h) use ($request) {
                    $h->where('house_number', 'like', "%{$request->search}%");
                })->orWhereHas('dueType', function ($d) use ($request) {
                    $d->where('name', 'like', "%{$request->search}%");
                });
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['amount_paid', 'payment_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), PaymentResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deleted = $this->paymentService->bulkDelete($validated['ids']);

        return response()->json(['data' => null, 'message' => "{$deleted} pembayaran berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Payment::class): JsonResponse
    {
        return $this->bulkRestoreWithCallback($request, $modelClass, function (EloquentCollection $payments): void {
            $this->paymentService->afterBulkRestore($payments);
        });
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Payment::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'bill_id' => 'required|exists:bills,id',
            'amount_paid' => 'required|numeric|min:0',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $payment = $this->paymentService->create($validated, $request->user()->id);

        return new PaymentResource($payment);
    }

    public function show(Request $request, Payment $payment)
    {
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        abort_unless(
            $request->user()->hasPermission('payments.view.all')
                || ($request->user()->hasPermission('payments.view.own')
                    && $request->user()->resident_id !== null
                    && $payment->bill?->resident_id === $request->user()->resident_id),
            403
        );

        return new PaymentResource($payment);
    }

    public function update(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'bill_id' => 'sometimes|exists:bills,id',
            'amount_paid' => 'sometimes|numeric|min:0',
            'payment_date' => 'sometimes|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $payment = $this->paymentService->update($payment, $validated);

        return new PaymentResource($payment);
    }

    public function destroy(Payment $payment)
    {
        $this->paymentService->delete($payment);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Payment $payment)
    {
        $this->restoreModel($payment, function (Payment $restoredPayment): void {
            $this->paymentService->afterRestore($restoredPayment);
        });
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        return new PaymentResource($payment);
    }

    public function forceDestroy(Payment $payment)
    {
        $this->forceDeleteModel($payment);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
