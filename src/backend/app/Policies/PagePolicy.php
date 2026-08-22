<?php

namespace App\Policies;

use App\Models\User;

class PagePolicy
{
    public function view(User $user): bool
    {
        return $user->hasPermission('pages.manage');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('pages.manage');
    }
}
