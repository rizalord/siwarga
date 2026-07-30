<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Validation\ValidationException;

class RoleService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Role
    {
        $role = Role::create($data);
        $role->permissions()->sync($data['permission_ids'] ?? []);

        return $role->load('permissions')->loadCount('users');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Role $role, array $data): Role
    {
        if ($role->isAdmin() && array_key_exists('name', $data) && $data['name'] !== Role::ADMIN_ROLE_NAME) {
            throw ValidationException::withMessages([
                'name' => ['Role admin tidak bisa diganti namanya karena merupakan role khusus sistem.'],
            ]);
        }

        $role->update($data);

        if (array_key_exists('permission_ids', $data)) {
            $role->permissions()->sync($data['permission_ids']);
        }

        return $role->load('permissions')->loadCount('users');
    }

    public function delete(Role $role): void
    {
        if ($role->isAdmin()) {
            throw ValidationException::withMessages([
                'role' => ['Role admin tidak bisa dihapus karena merupakan role khusus sistem.'],
            ]);
        }

        if ($role->users()->exists()) {
            throw ValidationException::withMessages([
                'role' => ['Role tidak bisa dihapus karena masih digunakan oleh pengguna.'],
            ]);
        }

        $role->delete();
    }
}
