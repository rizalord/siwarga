<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use App\Services\BillGenerationService;
use App\Services\BillService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BillController extends Controller
{
    public function __construct(
        private BillService $billService,
        private BillGenerationService $billGenerationService,
    ) {}

    public function index(Request $request)
    {
        $query = Bill::with(['house', 'resident', 'dueType'])
            ->withSum('payments as total_paid', 'amount_paid');

        $this->applyBillViewScope($request, $query);

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

        if ($request->filled('due_type_id')) {
            is_array($request->due_type_id)
                ? $query->whereIn('due_type_id', $request->due_type_id)
                : $query->where('due_type_id', $request->due_type_id);
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

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['period_start', 'period_end', 'amount_due', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), BillResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = $this->billService->deletableIds($validated['ids']);
        $deleted = Bill::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} tagihan berhasil dihapus. Sisanya tidak bisa dihapus karena sudah memiliki pembayaran.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} tagihan berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Bill::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Bill::class);
    }

    public function show(Request $request, Bill $bill)
    {
        abort_unless(
            $request->user()->hasPermission('bills.view.all')
                || ($request->user()->hasPermission('bills.view.own')
                    && $request->user()->resident_id !== null
                    && $bill->resident_id === $request->user()->resident_id),
            403
        );

        $bill->load(['house', 'resident', 'dueType', 'payments'])
            ->loadSum('payments as total_paid', 'amount_paid');

        return new BillResource($bill);
    }

    public function generate(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
        ]);

        $bills = $this->billGenerationService->generate(
            $validated['month'],
            $validated['year'],
            $request->user()->id
        );

        return response()->json([
            'data' => BillResource::collection($bills),
            'message' => $bills->count().' bills generated',
        ], 201);
    }

    public function generateFlexible(Request $request)
    {
        $validated = $request->validate([
            'due_type_id' => [
                'required',
                'integer',
                Rule::exists('due_types', 'id')->whereNull('deleted_at'),
            ],
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'amount_due' => 'required|numeric|min:0.01',
        ]);

        $bills = $this->billGenerationService->generateFlexible(
            $validated['due_type_id'],
            \Carbon\Carbon::parse($validated['period_start']),
            \Carbon\Carbon::parse($validated['period_end']),
            (float) $validated['amount_due'],
            $request->user()->id,
        );

        return response()->json([
            'data' => BillResource::collection($bills),
            'message' => $bills->count().' bills generated',
        ], 201);
    }

    public function destroy(Bill $bill)
    {
        try {
            $this->billService->delete($bill);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->errors()['bill'][0],
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Bill $bill)
    {
        $this->restoreModel($bill);
        $bill->load(['house', 'resident', 'dueType', 'payments'])
            ->loadSum('payments as total_paid', 'amount_paid');

        return new BillResource($bill);
    }

    public function forceDestroy(Bill $bill)
    {
        $this->forceDeleteModel($bill);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }

    private function applyBillViewScope(Request $request, $query): void
    {
        $user = $request->user();

        if ($user->hasPermission('bills.view.all')) {
            return;
        }

        abort_unless($user->hasPermission('bills.view.own') && $user->resident_id !== null, 403);
        $query->where('resident_id', $user->resident_id);
    }
}
