<?php

namespace App\Services;

use App\Models\Expense;

class ExpenseService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, int $createdBy): Expense
    {
        $data['created_by'] = $createdBy;

        return Expense::create($data)->load('category');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Expense $expense, array $data): Expense
    {
        $expense->update($data);

        return $expense->load('category');
    }

    public function delete(Expense $expense): void
    {
        $expense->delete();
    }
}
