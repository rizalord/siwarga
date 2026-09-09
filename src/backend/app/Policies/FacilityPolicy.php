<?php

namespace App\Policies;

use App\Models\Facility;
use App\Models\User;

class FacilityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('facilities.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('facilities.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('facilities.manage');
    }

    public function update(User $user, Facility $facility): bool
    {
        return $user->hasPermission('facilities.manage');
    }

    public function delete(User $user, Facility $facility): bool
    {
        return $user->hasPermission('facilities.manage');
    }
}
