<?php

namespace App\Policies;

use App\Models\User;

class BillPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('bills.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('bills.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('bills.generate');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('bills.generate');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('bills.generate');
    }

    public function restore(User $user): bool
    {
        return $user->hasPermission('bills.trash');
    }
}
