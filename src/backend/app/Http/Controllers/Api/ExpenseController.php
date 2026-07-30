<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private ExpenseService $expenseService) {}

    public function index(Request $request)
    {
        $query = Expense::query()->with('category');

        if ($request->month) {
            $query->whereMonth('expense_date', $request->month);
        }

        if ($request->year) {
            $query->whereYear('expense_date', $request->year);
        }

        if ($request->filled('category_id')) {
            is_array($request->category_id)
                ? $query->whereIn('category_id', $request->category_id)
                : $query->where('category_id', $request->category_id);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('description', 'like', "%{$request->search}%")
                    ->orWhereHas('category', function ($q) use ($request) {
                        $q->where('name', 'like', "%{$request->search}%");
                    });
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['amount', 'expense_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, Expense::class);
    }

    public function bulkRestore(Request $request, string $modelClass = Expense::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Expense::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:expense_categories,id',
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
        ]);

        $expense = $this->expenseService->create($validated, $request->user()->id);

        return new ExpenseResource($expense);
    }

    public function show(Expense $expense)
    {
        return new ExpenseResource($expense->load('category'));
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|exists:expense_categories,id',
            'description' => 'nullable|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
        ]);

        $expense = $this->expenseService->update($expense, $validated);

        return new ExpenseResource($expense);
    }

    public function destroy(Expense $expense)
    {
        $this->expenseService->delete($expense);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Expense $expense)
    {
        $this->restoreModel($expense);

        return new ExpenseResource($expense->load('category'));
    }

    public function forceDestroy(Expense $expense)
    {
        $this->forceDeleteModel($expense);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
