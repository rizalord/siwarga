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

    public function index(Request $request)
    {
        $query = DueType::query();

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['name', 'amount', 'billing_cycle', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), DueTypeResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        return $this->bulkDelete($request, DueType::class);
    }

    public function bulkRestore(Request $request, string $modelClass = DueType::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, DueType::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'amount' => 'required|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->create($validated);

        return new DueTypeResource($dueType);
    }

    public function show(DueType $dueType)
    {
        return new DueTypeResource($dueType);
    }

    public function update(Request $request, DueType $dueType)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:50',
            'amount' => 'sometimes|numeric|min:0',
            'billing_cycle' => 'sometimes|in:bulanan,fleksibel',
        ]);

        $dueType = $this->dueTypeService->update($dueType, $validated);

        return new DueTypeResource($dueType);
    }

    public function destroy(DueType $dueType)
    {
        $this->dueTypeService->delete($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(DueType $dueType)
    {
        $this->restoreModel($dueType);

        return new DueTypeResource($dueType);
    }

    public function forceDestroy(DueType $dueType)
    {
        $this->forceDeleteModel($dueType);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
