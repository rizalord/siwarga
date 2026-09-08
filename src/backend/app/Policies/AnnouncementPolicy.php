<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\HouseResident;
use App\Models\Role;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('announcements.view');
    }

    public function view(User $user): bool
    {
        return $user->hasPermission('announcements.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('announcements.manage');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function restore(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.trash')
            && $this->canManageCategory($user, $announcement->category);
    }

    public function publish(User $user, Announcement $announcement): bool
    {
        return $user->hasPermission('announcements.manage')
            && $this->canManageCategory($user, $announcement->category);
    }

    /**
     * Warga-side visibility: published + broadcast-or-targeted.
     * announcements.manage holders (admin) bypass the target filter.
     */
    public function viewForWarga(User $user, Announcement $announcement): bool
    {
        if (! $user->hasPermission('announcements.view')) {
            return false;
        }

        if ($announcement->published_at === null) {
            return false;
        }

        if ($user->hasPermission('announcements.manage')) {
            return true;
        }

        if (! $announcement->targets()->exists()) {
            return true;
        }

        return HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->whereIn('house_id', $announcement->targets()->pluck('house_id'))
            ->exists();
    }

    /**
     * Admin may manage any category. Anyone else holding announcements.manage
     * (i.e. Bendahara, per RoleSeeder) may only manage the "keuangan" category.
     */
    public function canManageCategory(User $user, string $category): bool
    {
        if ($user->roles->contains('name', Role::ADMIN_ROLE_NAME)) {
            return true;
        }

        return $category === 'keuangan';
    }
}
