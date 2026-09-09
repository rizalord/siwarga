<?php

namespace App\Policies;

use App\Models\User;

class SuggestionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('suggestions.create');
    }

    public function markReviewed(User $user): bool
    {
        return $user->hasPermission('suggestions.view');
    }
}
