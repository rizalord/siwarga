<?php

namespace App\Policies;

use App\Models\User;

class ContactMessagePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }

    public function update(User $user): bool
    {
        return $user->hasPermission('contact-messages.view');
    }
}
