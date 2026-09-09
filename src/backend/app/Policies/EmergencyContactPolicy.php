<?php

namespace App\Policies;

use App\Models\EmergencyContact;
use App\Models\User;

class EmergencyContactPolicy
{
    public function create(User $user): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }

    public function update(User $user, EmergencyContact $contact): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }

    public function delete(User $user, EmergencyContact $contact): bool
    {
        return $user->hasPermission('emergency-contacts.manage');
    }
}
