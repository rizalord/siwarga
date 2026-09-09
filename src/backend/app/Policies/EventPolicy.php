<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('events.manage');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('events.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('events.manage');
    }

    public function update(User $user, Event $event): bool
    {
        return $user->hasPermission('events.manage');
    }

    public function delete(User $user, Event $event): bool
    {
        return $user->hasPermission('events.manage');
    }
}
