<?php

namespace App\Policies;

use App\Models\CameraSnapshot;
use App\Models\User;

class CameraSnapshotPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('snapshots.view');
    }

    public function view(User $user, CameraSnapshot $snapshot): bool
    {
        return $user->hasPermission('snapshots.view');
    }

    public function delete(User $user, CameraSnapshot $snapshot): bool
    {
        return $user->hasPermission('cameras.manage');
    }
}
