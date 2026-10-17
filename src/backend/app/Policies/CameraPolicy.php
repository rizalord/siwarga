<?php

namespace App\Policies;

use App\Models\Camera;
use App\Models\User;

class CameraPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('cameras.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('cameras.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('cameras.manage');
    }

    public function update(User $user, Camera $camera): bool
    {
        return $user->hasPermission('cameras.manage');
    }

    public function delete(User $user, Camera $camera): bool
    {
        return $user->hasPermission('cameras.manage');
    }
}
