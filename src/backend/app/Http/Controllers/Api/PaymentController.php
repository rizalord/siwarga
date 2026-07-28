<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with('bill');

        if ($request->user()->resident_id) {
            $query->whereHas('bill', function ($q) use ($request) {
                $q->where('resident_id', $request->user()->resident_id);
            });
        }

        return PaymentResource::collection($query->paginate($request->per_page ?? 10));
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

        return new PaymentResource($payment);
    }

    public function show(Request $request, Payment $payment)
    {
        $payment->load('bill');

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
}
