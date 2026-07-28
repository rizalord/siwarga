<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    /**
     * The role name reserved for the system administrator. It cannot be
     * deleted or renamed, and at most one user may hold it at a time.
     */
    public const ADMIN_ROLE_NAME = 'admin';

    protected $fillable = ['name', 'description'];

    protected $appends = ['is_admin'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    public function isAdmin(): bool
    {
        return $this->name === self::ADMIN_ROLE_NAME;
    }

    protected function getIsAdminAttribute(): bool
    {
        return $this->isAdmin();
    }
}
