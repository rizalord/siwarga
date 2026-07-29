<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Bill;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        if ($request->user()->resident_id) {
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

        $payments = Payment::whereIn('id', $validated['ids'])->get();
        $billIds = $payments->pluck('bill_id')->unique();

        $deleted = Payment::destroy($payments->pluck('id'));

        Bill::whereIn('id', $billIds)->each(function (Bill $bill) {
            $totalPaid = $bill->payments()->sum('amount_paid');
            $bill->update(['status' => $totalPaid >= $bill->amount_due ? 'lunas' : 'belum_lunas']);
        });

        return response()->json(['data' => null, 'message' => "{$deleted} pembayaran berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Payment::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
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

        $validated['created_by'] = $request->user()->id;

        $payment = Payment::create($validated);

        // Auto-update bill status to 'lunas' when fully paid
        $bill = $payment->bill;
        $totalPaid = $bill->payments()->sum('amount_paid');
        if ($totalPaid >= $bill->amount_due) {
            $bill->update(['status' => 'lunas']);
        }

        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        return new PaymentResource($payment);
    }

    public function show(Request $request, Payment $payment)
    {
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        abort_if(
            $request->user()->resident_id && $payment->bill?->resident_id !== $request->user()->resident_id,
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

        $payment->update($validated);

        // Re-check bill status after update
        if ($payment->bill) {
            $totalPaid = $payment->bill->payments()->sum('amount_paid');
            if ($totalPaid >= $payment->bill->amount_due) {
                $payment->bill->update(['status' => 'lunas']);
            } else {
                $payment->bill->update(['status' => 'belum_lunas']);
            }
        }

        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        return new PaymentResource($payment);
    }

    public function destroy(Payment $payment)
    {
        $bill = $payment->bill;
        $payment->delete();

        // Re-check bill status after deletion
        if ($bill) {
            $totalPaid = $bill->payments()->sum('amount_paid');
            if ($totalPaid >= $bill->amount_due) {
                $bill->update(['status' => 'lunas']);
            } else {
                $bill->update(['status' => 'belum_lunas']);
            }
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Payment $payment)
    {
        $payment->restore();
        $payment->load(['bill.house', 'bill.resident', 'bill.dueType', 'creator']);

        return new PaymentResource($payment);
    }

    public function forceDestroy(Payment $payment)
    {
        $payment->forceDelete();

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
