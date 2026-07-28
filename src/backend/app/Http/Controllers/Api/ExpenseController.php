<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::query();

        if ($request->month) {
            $query->whereMonth('expense_date', $request->month);
        }

        if ($request->year) {
            $query->whereYear('expense_date', $request->year);
        }

        if ($request->filled('category')) {
            is_array($request->category)
                ? $query->whereIn('category', $request->category)
                : $query->where('category', $request->category);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('category', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        $this->applySorting($query, $request, ['category', 'amount', 'expense_date', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, Expense::class);
    }

    public function categories()
    {
        return response()->json([
            'data' => Expense::query()->distinct()->orderBy('category')->pluck('category'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category' => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
        ]);

        $validated['created_by'] = $request->user()->id;

        $expense = Expense::create($validated);

        return new ExpenseResource($expense);
    }

    public function show(Expense $expense)
    {
        return new ExpenseResource($expense);
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'category' => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'expense_date' => 'sometimes|date',
        ]);

        $expense->update($validated);

        return new ExpenseResource($expense);
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
