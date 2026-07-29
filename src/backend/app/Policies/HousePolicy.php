<?php

namespace App\Policies;

use App\Models\User;

class HousePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('houses.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('houses.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('houses.create');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('houses.edit');
    }

    public function delete(User $user): bool
    {
        return $user->hasPermission('houses.delete');
    }

    public function assign(User $user): bool
    {
        return $user->hasPermission('houses.assign');
    }

    public function restore(User $user): bool
    {
        return $user->hasPermission('houses.trash');
    }
}
