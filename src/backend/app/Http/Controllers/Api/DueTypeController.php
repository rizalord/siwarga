<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DueTypeResource;
use App\Models\DueType;
use App\Services\DueTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DueTypeController extends Controller
{
    public function __construct(private DueTypeService $dueTypeService) {}

    public function index(Request $request): JsonResponse
    {
        $query = DueType::query();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->string('search')}%");
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'amount', 'billing_cycle', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), DueTypeResource::class);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        return $this->bulkDelete($request, DueType::class);
    }

    public function bulkRestore(Request $request, string $modelClass = DueType::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request): JsonResponse
    {
        return $this->bulkForceDelete($request, DueType::class);
    }

    public function store(Request $request): DueTypeResource
    {
        $validated = $this->validate($request, [
            'name' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->create($validated);

        return new DueTypeResource($dueType);
    }

    public function show(DueType $dueType): DueTypeResource
    {
        return new DueTypeResource($dueType);
    }

    public function update(Request $request, DueType $dueType): DueTypeResource
    {
        $validated = $this->validate($request, [
            'name' => 'sometimes|string|max:50',
            'amount' => 'sometimes|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->update($dueType, $validated);

        return new DueTypeResource($dueType);
    }

    public function destroy(DueType $dueType): JsonResponse
    {
        $this->dueTypeService->delete($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(DueType $dueType): DueTypeResource
    {
        $this->restoreModel($dueType);

        return new DueTypeResource($dueType);
    }

    public function forceDestroy(DueType $dueType): JsonResponse
    {
        $this->forceDeleteModel($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
