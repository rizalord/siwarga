<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /**
     * @return BelongsToMany<Permission, $this>
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    /**
     * @return Attribute<bool, never>
     */
    protected function isAdmin(): Attribute
    {
        return Attribute::get(fn (): bool => $this->name === self::ADMIN_ROLE_NAME);
    }
}
