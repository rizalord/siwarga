<?php

namespace App\Policies;

use App\Models\AssetLoan;
use App\Models\User;

class AssetLoanPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('asset-loans.request');
    }

    public function view(User $user, AssetLoan $loan): bool
    {
        if ($user->hasPermission('asset-loans.review')) {
            return true;
        }

        return $user->hasPermission('asset-loans.request') && $loan->borrowed_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('asset-loans.request');
    }

    public function review(User $user, AssetLoan $loan): bool
    {
        return $user->hasPermission('asset-loans.review');
    }

    public function return(User $user, AssetLoan $loan): bool
    {
        return $loan->borrowed_by === $user->id || $user->hasPermission('asset-loans.review');
    }
}
