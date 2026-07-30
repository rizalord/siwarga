<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResidentResource;
use App\Models\Resident;
use App\Services\ResidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ResidentController extends Controller
{
    public function __construct(private ResidentService $residentService) {}

    public function index(Request $request)
    {
        $query = Resident::query();

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->filled('marital_status')) {
            is_array($request->marital_status)
                ? $query->whereIn('marital_status', $request->marital_status)
                : $query->where('marital_status', $request->marital_status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', "%{$request->search}%")
                    ->orWhere('phone_number', 'like', "%{$request->search}%");
            });
        }

        $this->applyTrashedFilter($query, $request);
        $this->applySorting($query, $request, ['full_name', 'status', 'phone_number', 'marital_status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), ResidentResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = $this->residentService->deletableIds($validated['ids']);
        $deleted = Resident::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} penghuni berhasil dihapus. Sisanya tidak bisa dihapus karena masih ditempatkan di sebuah rumah.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} penghuni berhasil dihapus"]);
    }

    public function bulkRestore(Request $request, string $modelClass = Resident::class): JsonResponse
    {
        return parent::bulkRestore($request, $modelClass);
    }

    public function bulkForceDestroy(Request $request)
    {
        return $this->bulkForceDelete($request, Resident::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:150',
            'status' => 'required|in:kontrak,tetap',
            'phone_number' => 'required|string|max:20',
            'marital_status' => 'required|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        $resident = $this->residentService->create($validated, $request->file('ktp_photo'));

        return new ResidentResource($resident, 201);
    }

    public function show(Resident $resident)
    {
        return new ResidentResource($resident);
    }

    public function update(Request $request, Resident $resident)
    {
        $validated = $request->validate([
            'full_name' => 'sometimes|string|max:150',
            'status' => 'sometimes|in:kontrak,tetap',
            'phone_number' => 'sometimes|string|max:20',
            'marital_status' => 'sometimes|in:menikah,belum_menikah',
            'ktp_photo' => 'nullable|image|max:2048',
        ]);

        $resident = $this->residentService->update($resident, $validated, $request->file('ktp_photo'));

        return new ResidentResource($resident);
    }

    public function destroy(Resident $resident)
    {
        try {
            $this->residentService->delete($resident);
        } catch (ValidationException $exception) {
            return response()->json([
                'message' => 'Penghuni tidak bisa dihapus karena masih ditempatkan di sebuah rumah. Kosongkan rumah terlebih dahulu.',
            ], 422);
        }

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function restore(Resident $resident)
    {
        $this->restoreModel($resident);

        return new ResidentResource($resident);
    }

    public function forceDestroy(Resident $resident)
    {
        $this->forceDeleteModel($resident);

        return response()->json(['data' => null, 'message' => 'Deleted permanently']);
    }
}
