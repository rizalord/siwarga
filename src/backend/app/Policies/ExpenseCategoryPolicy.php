<?php

namespace App\Policies;

use App\Models\User;

class ExpenseCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('expense-categories.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('expense-categories.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('expense-categories.manage');
    }
}
