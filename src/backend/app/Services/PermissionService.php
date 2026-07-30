<?php

namespace App\Services;

use App\Models\Permission;
use Illuminate\Validation\ValidationException;

class PermissionService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Permission
    {
        return Permission::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Permission $permission, array $data): Permission
    {
        $permission->update($data);

        return $permission;
    }

    public function delete(Permission $permission): void
    {
        if ($permission->isSystem()) {
            throw ValidationException::withMessages([
                'name' => ['Permission ini adalah permission inti sistem dan tidak bisa dihapus.'],
            ]);
        }

        $permission->delete();
    }
}
