<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PermissionController extends Controller
{
    public function __construct(private PermissionService $permissionService) {}

    public function index(Request $request)
    {
        $query = Permission::query()->withCount('roles');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        $this->applySorting($query, $request, ['name'], 'name', 'asc');

        return $query->paginate($request->per_page ?? 10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/', 'unique:permissions,name'],
            'description' => 'nullable|string|max:255',
        ]);

        $permission = $this->permissionService->create($validated);

        return response()->json(['data' => $permission], 201);
    }

    public function show(Permission $permission)
    {
        return response()->json(['data' => $permission]);
    }

    public function update(Request $request, Permission $permission)
    {
        if ($permission->isSystem()) {
            $validated = $request->validate([
                'description' => 'nullable|string|max:255',
            ]);
        } else {
            $validated = $request->validate([
                'name' => [
                    'sometimes', 'string', 'max:100', 'regex:/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/',
                    Rule::unique('permissions', 'name')->ignore($permission->id),
                ],
                'description' => 'nullable|string|max:255',
            ]);
        }

        $permission = $this->permissionService->update($permission, $validated);

        return response()->json(['data' => $permission]);
    }

    public function destroy(Permission $permission)
    {
        try {
            $this->permissionService->delete($permission);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Permission ini adalah permission inti sistem dan tidak bisa dihapus.',
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
