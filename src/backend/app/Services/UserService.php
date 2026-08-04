<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): User
    {
        if (array_key_exists('role_ids', $data) && $this->assignsAdminRole($data['role_ids']) && $this->otherAdminExists()) {
            throw ValidationException::withMessages([
                'role_ids' => ['Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.'],
            ]);
        }

        $data['password'] = Hash::make($data['password']);
        $roleIds = $data['role_ids'] ?? null;
        unset($data['role_ids']);

        $user = User::create($data);

        if ($roleIds !== null) {
            $user->roles()->attach($roleIds);
        }

        return $user->load(['roles', 'resident']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        if (array_key_exists('role_ids', $data)) {
            $userIsAdmin = $this->isAdmin($user);
            $willBeAdmin = $this->assignsAdminRole($data['role_ids']);

            if ($userIsAdmin && ! $willBeAdmin) {
                throw ValidationException::withMessages([
                    'role_ids' => ['User dengan role admin tidak bisa dipindahkan ke role lain.'],
                ]);
            }

            if (! $userIsAdmin && $willBeAdmin && $this->otherAdminExists($user->id)) {
                throw ValidationException::withMessages([
                    'role_ids' => ['Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.'],
                ]);
            }
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $roleIds = $data['role_ids'] ?? null;
        unset($data['role_ids']);

        $user->update($data);

        if ($roleIds !== null) {
            $user->roles()->sync($roleIds);
        }

        return $user->load(['roles', 'resident']);
    }

    public function delete(User $user): void
    {
        if ($this->isAdmin($user)) {
            throw ValidationException::withMessages([
                'user' => ['User dengan role admin tidak bisa dihapus.'],
            ]);
        }

        $user->delete();
    }

    public function forceDelete(User $user): void
    {
        if ($this->isAdmin($user)) {
            throw ValidationException::withMessages([
                'user' => ['User dengan role admin tidak bisa dihapus.'],
            ]);
        }

        $user->forceDelete();
    }

    /**
     * Direct relation query on the model instance, unaffected by the SoftDeletes
     * global scope that `anyUserHasAdminRole()`/`bulkDeletable()` are subject to.
     */
    public function isAdmin(User $user): bool
    {
        return $this->userHasAdminRole($user);
    }

    /**
     * @param  array<int, int>  $ids
     */
    public function bulkDeletable(array $ids): bool
    {
        return ! $this->anyUserHasAdminRole($ids);
    }

    /**
     * @param  array<int, int>  $roleIds
     */
    private function assignsAdminRole(array $roleIds): bool
    {
        $adminRoleId = Role::where('name', Role::ADMIN_ROLE_NAME)->value('id');

        return $adminRoleId && in_array($adminRoleId, $roleIds);
    }

    private function userHasAdminRole(User $user): bool
    {
        return $user->roles()->where('name', Role::ADMIN_ROLE_NAME)->exists();
    }

    /**
     * @param  array<int, int>  $userIds
     */
    private function anyUserHasAdminRole(array $userIds): bool
    {
        return User::whereIn('id', $userIds)
            ->whereHas('roles', function ($query) {
                $query->where('name', Role::ADMIN_ROLE_NAME);
            })
            ->exists();
    }

    private function otherAdminExists(?int $excludeUserId = null): bool
    {
        return User::whereHas('roles', function ($query) {
            $query->where('name', Role::ADMIN_ROLE_NAME);
        })
            ->when($excludeUserId, fn ($query) => $query->where('users.id', '!=', $excludeUserId))
            ->exists();
    }
}
