<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ExpenseCategory::query();
        $this->applyTrashedFilter($query, $request);

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ExpenseCategoryResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, ExpenseCategory::class);
    }

    public function bulkRestore(Request $request, string $modelClass = ExpenseCategory::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request): JsonResponse
    {
        return $this->bulkForceDelete($request, ExpenseCategory::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('expense_categories', 'name')],
        ]);

        $expenseCategory = ExpenseCategory::create($validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function show(ExpenseCategory $expenseCategory)
    {
        return new ExpenseCategoryResource($expenseCategory);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('expense_categories', 'name')->ignore($expenseCategory->id)],
        ]);

        $expenseCategory->update($validated);

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function destroy(ExpenseCategory $expenseCategory)
    {
        $expenseCategory->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(ExpenseCategory $expenseCategory)
    {
        $expenseCategory->restore();

        return new ExpenseCategoryResource($expenseCategory);
    }

    public function forceDestroy(ExpenseCategory $expenseCategory)
    {
        $expenseCategory->forceDelete();

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
