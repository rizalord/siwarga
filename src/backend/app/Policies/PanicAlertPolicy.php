<?php

namespace App\Policies;

use App\Models\PanicAlert;
use App\Models\User;

class PanicAlertPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('panic-alerts.handle');
    }

    public function view(User $user, PanicAlert $alert): bool
    {
        if ($user->hasPermission('panic-alerts.handle')) {
            return true;
        }

        return $user->hasPermission('panic-alerts.report') && $alert->reporter_id === $user->id;
    }

    public function report(User $user): bool
    {
        return $user->hasPermission('panic-alerts.report');
    }

    public function handle(User $user, PanicAlert $alert): bool
    {
        return $user->hasPermission('panic-alerts.handle');
    }

    public function cancel(User $user, PanicAlert $alert): bool
    {
        return $alert->reporter_id === $user->id || $user->hasPermission('panic-alerts.handle');
    }
}
