<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $query = Role::with('permissions')->withCount('users');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $query->paginate($request->per_page ?? 10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $role = Role::create($validated);
        $role->permissions()->sync($validated['permission_ids'] ?? []);

        return response()->json(['data' => $role->load('permissions')->loadCount('users')], 201);
    }

    public function show(Role $role)
    {
        return response()->json(['data' => $role->load('permissions')->loadCount('users')]);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $role->update($validated);

        if (array_key_exists('permission_ids', $validated)) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return response()->json(['data' => $role->load('permissions')->loadCount('users')]);
    }

    public function destroy(Role $role)
    {
        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Role tidak bisa dihapus karena masih digunakan oleh pengguna.',
            ], 422);
        }

        $role->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
