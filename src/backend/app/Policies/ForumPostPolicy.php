<?php

namespace App\Policies;

use App\Models\ForumPost;
use App\Models\User;

class ForumPostPolicy
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

    public function delete(User $user, ForumPost $post): bool
    {
        return $user->hasPermission('forum.manage') || $post->user_id === $user->id;
    }
}
