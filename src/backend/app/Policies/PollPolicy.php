<?php

namespace App\Policies;

use App\Models\Poll;
use App\Models\User;

class PollPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('polls.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('polls.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('polls.manage');
    }

    public function update(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.manage') && now()->lt($poll->starts_at);
    }

    public function delete(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.manage');
    }

    public function vote(User $user, Poll $poll): bool
    {
        return $user->hasPermission('polls.vote')
            && now()->between($poll->starts_at, $poll->ends_at)
            && ! $poll->votes()->where('user_id', $user->id)->exists();
    }

    public function results(User $user, Poll $poll): bool
    {
        if ($user->hasPermission('polls.manage')) {
            return true;
        }

        return $poll->votes()->where('user_id', $user->id)->exists()
            || now()->gt($poll->ends_at);
    }
}
