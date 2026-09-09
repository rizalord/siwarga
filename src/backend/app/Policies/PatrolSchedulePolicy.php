<?php

namespace App\Policies;

use App\Models\PatrolSchedule;
use App\Models\User;

class PatrolSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }

    public function update(User $user, PatrolSchedule $schedule): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }

    public function delete(User $user, PatrolSchedule $schedule): bool
    {
        return $user->hasPermission('patrol-schedules.manage');
    }
}
