<?php

namespace App\Policies;

use App\Models\User;

class DueTypePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('due-types.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('due-types.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('due-types.manage');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('due-types.manage');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('due-types.manage');
    }
}
