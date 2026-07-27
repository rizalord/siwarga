<?php

namespace App\Policies;

use App\Models\User;

class PaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('payments.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('payments.view');
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
}
