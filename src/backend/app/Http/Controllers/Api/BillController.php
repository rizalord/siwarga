<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use App\Services\BillGenerationService;
use Illuminate\Http\Request;

class BillController extends Controller
{
    public function index(Request $request)
    {
        $query = Bill::with(['house', 'resident', 'dueType']);

        if ($request->user()->resident_id) {
            $query->where('resident_id', $request->user()->resident_id);
        }

        if ($request->month) {
            $query->whereMonth('period_start', $request->month);
        }

        if ($request->year) {
            $query->whereYear('period_start', $request->year);
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->whereHas('resident', function ($r) use ($request) {
                    $r->where('full_name', 'like', "%{$request->search}%");
                })->orWhereHas('house', function ($h) use ($request) {
                    $h->where('house_number', 'like', "%{$request->search}%");
                });
            });
        }

        return $this->paginated($query->paginate($request->per_page ?? 10), BillResource::class);
    }

    public function show(Request $request, Bill $bill)
    {
        abort_if(
            $request->user()->resident_id && $bill->resident_id !== $request->user()->resident_id,
            403
        );

        $bill->load(['house', 'resident', 'dueType', 'payments']);

        return new BillResource($bill);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
        ]);

        $service = new BillGenerationService;
        $bills = $service->generate(
            $validated['month'],
            $validated['year'],
            $request->user()->id
        );

        return response()->json([
            'data' => BillResource::collection($bills),
            'message' => $bills->count().' bills generated',
        ], 201);
    }

    public function destroy(Bill $bill)
    {
        $bill->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
