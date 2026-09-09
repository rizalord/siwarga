<?php

namespace App\Policies;

use App\Models\PaymentTransaction;
use App\Models\User;

class PaymentTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('payments.online')
            || $user->hasPermission('payments.verify');
    }

    public function view(User $user, PaymentTransaction $transaction): bool
    {
        if ($user->hasPermission('payments.view.all') || $user->hasPermission('payments.verify')) {
            return true;
        }

        return $user->hasPermission('payments.online') && $transaction->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('payments.online');
    }

    public function verify(User $user, PaymentTransaction $transaction): bool
    {
        return $user->hasPermission('payments.verify');
    }
}
