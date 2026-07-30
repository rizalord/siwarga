<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'email', 'is_active', 'created_at']);

        return $query->paginate($request->per_page ?? 10);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        if ($this->anyUserHasAdminRole($validated['ids'])) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        return $this->bulkDelete($request, User::class);
    }

    public function bulkRestore(Request $request, string $modelClass = User::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        if ($this->anyUserHasAdminRole($validated['ids'])) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        return $this->bulkForceDelete($request, User::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if ($request->has('role_ids') && $this->assignsAdminRole($request->role_ids) && $this->otherAdminExists()) {
            return response()->json([
                'message' => 'Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.',
            ], 422);
        }

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);

        if ($request->has('role_ids')) {
            $user->roles()->attach($request->role_ids);
        }

        return response()->json(['data' => $user->load('roles')], 201);
    }

    public function show(User $user)
    {
        return response()->json(['data' => $user->load('roles')]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'sometimes|string|min:8',
            'is_active' => 'sometimes|boolean',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id,'.$user->id,
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if ($request->has('role_ids')) {
            $userIsAdmin = $this->userHasAdminRole($user);
            $willBeAdmin = $this->assignsAdminRole($request->role_ids);

            if ($userIsAdmin && ! $willBeAdmin) {
                return response()->json([
                    'message' => 'User dengan role admin tidak bisa dipindahkan ke role lain.',
                ], 422);
            }

            if (! $userIsAdmin && $willBeAdmin && $this->otherAdminExists($user->id)) {
                return response()->json([
                    'message' => 'Sudah ada user dengan role admin. Hanya diperbolehkan satu admin untuk menghindari konflik kepentingan.',
                ], 422);
            }
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        if ($request->has('role_ids')) {
            $user->roles()->sync($request->role_ids);
        }

        return response()->json(['data' => $user->load('roles')]);
    }

    public function destroy(User $user)
    {
        if ($this->userHasAdminRole($user)) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        $user->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(User $user)
    {
        $this->restoreModel($user);

        return response()->json(['data' => $user->load('roles')]);
    }

    public function forceDestroy(User $user)
    {
        if ($this->userHasAdminRole($user)) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        $this->forceDeleteModel($user);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
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
