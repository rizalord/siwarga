<?php

namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

class AssetPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('assets.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('assets.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('assets.manage');
    }

    public function update(User $user, Asset $asset): bool
    {
        return $user->hasPermission('assets.manage');
    }

    public function delete(User $user, Asset $asset): bool
    {
        return $user->hasPermission('assets.manage');
    }
}
