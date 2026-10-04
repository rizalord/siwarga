<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RoleController extends Controller
{
    public function __construct(private RoleService $roleService) {}

    /**
     * @return LengthAwarePaginator<int, Role>
     */
    public function index(Request $request): LengthAwarePaginator
    {
        $query = Role::with('permissions')->withCount('users');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->string('search')}%");
        }

        $this->applySorting($query, $request, ['name', 'created_at']);

        return $query->paginate($request->integer('per_page') ?: 10);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => 'required|string|max:50|unique:roles,name',
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $role = $this->roleService->create($validated);

        return response()->json(['data' => $role], 201);
    }

    public function show(Role $role): JsonResponse
    {
        return response()->json(['data' => $role->load('permissions')->loadCount('users')]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => 'sometimes|string|max:50|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:255',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        try {
            $role = $this->roleService->update($role, $validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('name'),
            ], 422);
        }

        return response()->json(['data' => $role]);
    }

    public function destroy(Role $role): JsonResponse
    {
        try {
            $this->roleService->delete($role);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('role'),
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
