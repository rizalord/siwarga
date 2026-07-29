<?php

namespace App\Policies;

use App\Models\User;

class ResidentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('residents.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('residents.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('residents.create');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('residents.edit');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('residents.delete');
    }

    public function restore(User $user): bool
    {
        return $user->hasPermission('residents.trash');
    }
}
