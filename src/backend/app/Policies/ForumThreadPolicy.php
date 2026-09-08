<?php

namespace App\Policies;

use App\Models\ForumThread;
use App\Models\User;

class ForumThreadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('forum.view');
    }

    public function delete(User $user, ForumThread $thread): bool
    {
        return $user->hasPermission('forum.manage') || $thread->created_by === $user->id;
    }
}
