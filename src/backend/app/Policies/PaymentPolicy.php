<?php

namespace App\Policies;

use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('payments.view') && $this->hasViewScope($user);
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('payments.view') && $this->hasViewScope($user);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('payments.create');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('payments.create');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('payments.create');
    }

    public function restore(User $user): bool
    {
        return $user->hasPermission('payments.trash');
    }

    private function hasViewScope(User $user): bool
    {
        return $user->hasPermission('payments.view.all')
            || ($user->hasPermission('payments.view.own') && $user->resident_id !== null);
    }
}
