<?php

namespace App\Policies;

use App\Models\FamilyMember;
use App\Models\HouseResident;
use App\Models\User;

class FamilyMemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('family-members.view');
    }

    public function view(User $user, FamilyMember $member): bool
    {
        if ($user->hasPermission('family-members.manage')) {
            return true;
        }

        return $user->hasPermission('family-members.view') && $member->house_id === $this->ownHouseId($user);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('family-members.manage') || $user->hasPermission('family-members.view');
    }

    public function update(User $user, FamilyMember $member): bool
    {
        return $this->view($user, $member);
    }

    public function delete(User $user, FamilyMember $member): bool
    {
        return $this->view($user, $member);
    }

    private function ownHouseId(User $user): ?int
    {
        if ($user->resident_id === null) {
            return null;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');
    }
}
