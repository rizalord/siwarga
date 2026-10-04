<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function __construct(private UserService $userService) {}

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function index(Request $request): LengthAwarePaginator
    {
        $query = User::with(['roles', 'resident']);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->string('search')}%")
                    ->orWhere('email', 'like', "%{$request->string('search')}%");
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'email', 'is_active', 'created_at']);

        return $query->paginate($request->integer('per_page') ?: 10);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $ids = $this->validatedIds($request);

        if (! $this->userService->bulkDeletable($ids)) {
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

    public function bulkForceDestroy(Request $request): JsonResponse
    {
        $ids = $this->validatedIds($request);

        if (! $this->userService->bulkDeletable($ids)) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        return $this->bulkForceDelete($request, User::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        try {
            $user = $this->userService->create($validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('role_ids'),
            ], 422);
        }

        return response()->json(['data' => $user], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $user->load(['roles', 'resident'])]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'sometimes|string|min:8',
            'is_active' => 'sometimes|boolean',
            'resident_id' => 'sometimes|nullable|exists:residents,id|unique:users,resident_id,'.$user->id,
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        try {
            $user = $this->userService->update($user, $validated);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('role_ids'),
            ], 422);
        }

        return response()->json(['data' => $user]);
    }

    public function destroy(User $user): JsonResponse
    {
        try {
            $this->userService->delete($user);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('user'),
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(User $user): JsonResponse
    {
        $this->restoreModel($user);

        return response()->json(['data' => $user->load(['roles', 'resident'])]);
    }

    public function forceDestroy(User $user): JsonResponse
    {
        if ($this->userService->isAdmin($user)) {
            return response()->json([
                'message' => 'User dengan role admin tidak bisa dihapus.',
            ], 422);
        }

        $this->forceDeleteModel($user);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
