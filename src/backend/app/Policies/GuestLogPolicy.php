<?php

namespace App\Policies;

use App\Models\GuestLog;
use App\Models\User;

class GuestLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('guest-logs.view');
    }

    public function view(User $user, GuestLog $log): bool
    {
        if ($user->hasPermission('guest-logs.manage')) {
            return true;
        }

        return $user->hasPermission('guest-logs.view') && $log->registered_by === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('guest-logs.register');
    }

    public function checkIn(User $user, GuestLog $log): bool
    {
        return $user->hasPermission('guest-logs.manage');
    }

    public function checkOut(User $user, GuestLog $log): bool
    {
        return $user->hasPermission('guest-logs.manage');
    }
}
