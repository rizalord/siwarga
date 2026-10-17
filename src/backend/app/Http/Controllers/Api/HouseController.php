<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HouseResource;
use App\Models\House;
use App\Services\HouseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HouseController extends Controller
{
    public function __construct(private HouseService $houseService) {}

    public function index(Request $request): JsonResponse
    {
        $query = House::query()->with('currentResident');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('house_number', 'like', "%{$request->string('search')}%")
                    ->orWhere('address', 'like', "%{$request->string('search')}%");
            });
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['house_number', 'address', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), HouseResource::class);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $ids = $this->validatedIds($request);

        $deletableIds = $this->houseService->deletableIds($ids);
        $deleted = House::destroy($deletableIds);

        if ($deleted < count($ids)) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} rumah berhasil dihapus. Sisanya tidak bisa dihapus karena masih berpenghuni aktif atau memiliki histori transaksi.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} rumah berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = House::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request): JsonResponse
    {
        return $this->bulkForceDelete($request, House::class);
    }

    public function store(Request $request): HouseResource
    {
        $validated = $this->validate($request, [
            'house_number' => 'required|string|max:20|unique:houses,house_number',
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house = House::create($validated);

        return new HouseResource($house);
    }

    public function show(House $house): HouseResource
    {
        $house->load('currentResident');

        return new HouseResource($house);
    }

    public function update(Request $request, House $house): HouseResource
    {
        $validated = $this->validate($request, [
            'house_number' => 'sometimes|string|max:20|unique:houses,house_number,'.$house->id,
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house->update($validated);

        return new HouseResource($house);
    }

    public function destroy(House $house): JsonResponse
    {
        try {
            $this->houseService->delete($house);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('house'),
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(House $house): HouseResource
    {
        $this->restoreModel($house);
        $house->load('currentResident');

        return new HouseResource($house);
    }

    public function forceDestroy(House $house): JsonResponse
    {
        $this->forceDeleteModel($house);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }

    public function history(House $house): JsonResponse
    {
        $history = $house->houseResidents()
            ->with('resident')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json(['data' => $history]);
    }

    public function assignResident(Request $request, House $house): JsonResponse
    {
        $this->validate($request, [
            'resident_id' => 'required|exists:residents,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        $houseResident = $this->houseService->assignResident(
            $house,
            $request->integer('resident_id'),
            $request->string('start_date')->toString(),
            $this->optionalString($request, 'end_date'),
        );

        return response()->json(['data' => $houseResident], 201);
    }

    public function vacateResident(Request $request, House $house): JsonResponse
    {
        $this->validate($request, [
            'end_date' => 'nullable|date',
        ]);

        try {
            $this->houseService->vacateResident($house, $this->optionalString($request, 'end_date'));
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => $exception->validator->errors()->first('house'),
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Penghuni berhasil dicopot dari rumah']);
    }
}
