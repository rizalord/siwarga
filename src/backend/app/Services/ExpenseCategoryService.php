<?php

namespace App\Services;

use App\Models\ExpenseCategory;

class ExpenseCategoryService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): ExpenseCategory
    {
        return ExpenseCategory::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ExpenseCategory $expenseCategory, array $data): ExpenseCategory
    {
        $expenseCategory->update($data);

        return $expenseCategory;
    }

    public function delete(ExpenseCategory $expenseCategory): void
    {
        $expenseCategory->delete();
    }
}
