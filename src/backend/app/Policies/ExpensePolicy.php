<?php

namespace App\Policies;

use App\Models\User;

class ExpensePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('expenses.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('expenses.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('expenses.create');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('expenses.edit');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('expenses.delete');
    }
}
