<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HouseResource;
use App\Models\House;
use Illuminate\Http\Request;

class HouseController extends Controller
{
    public function index(Request $request)
    {
        $query = House::query()->with('currentResident');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('house_number', 'like', "%{$request->search}%")
                    ->orWhere('address', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['house_number', 'address', 'status', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), HouseResource::class);
    }

    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $deletableIds = House::whereIn('id', $validated['ids'])
            ->whereDoesntHave('bills')
            ->pluck('id');

        $deleted = House::destroy($deletableIds);

        if ($deleted < count($validated['ids'])) {
            return response()->json([
                'data' => null,
                'message' => "{$deleted} rumah berhasil dihapus. Sisanya tidak bisa dihapus karena memiliki histori transaksi.",
            ], 207);
        }

        return response()->json(['data' => null, 'message' => "{$deleted} rumah berhasil dihapus"]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'house_number' => 'required|string|max:20|unique:houses,house_number',
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house = House::create($validated);

        return new HouseResource($house, 201);
    }

    public function show(House $house)
    {
        $house->load('currentResident');

        return new HouseResource($house);
    }

    public function update(Request $request, House $house)
    {
        $validated = $request->validate([
            'house_number' => 'sometimes|string|max:20|unique:houses,house_number,'.$house->id,
            'address' => 'nullable|string|max:255',
            'status' => 'sometimes|in:dihuni,kosong',
        ]);

        $house->update($validated);

        return new HouseResource($house);
    }

    public function destroy(House $house)
    {
        if ($house->bills()->exists()) {
            return response()->json([
                'message' => 'Rumah tidak bisa dihapus karena memiliki histori transaksi.',
            ], 422);
        }

        $house->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    public function history(House $house)
    {
        $history = $house->houseResidents()
            ->with('resident')
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json(['data' => $history]);
    }

    public function assignResident(Request $request, House $house)
    {
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
        ]);

        // End current active assignment
        $house->houseResidents()->whereNull('end_date')->update(['end_date' => $validated['start_date']]);

        $houseResident = $house->houseResidents()->create($validated);

        // Update house status to occupied
        $house->update(['status' => 'dihuni']);

        return response()->json(['data' => $houseResident], 201);
    }

    public function vacateResident(Request $request, House $house)
    {
        $validated = $request->validate([
            'end_date' => 'nullable|date',
        ]);

        $activeAssignment = $house->houseResidents()->whereNull('end_date')->first();

        if (! $activeAssignment) {
            return response()->json([
                'message' => 'Rumah ini tidak memiliki penghuni aktif.',
            ], 422);
        }

        $activeAssignment->update(['end_date' => $validated['end_date'] ?? now()->toDateString()]);

        $house->update(['status' => 'kosong']);

        return response()->json(['data' => null, 'message' => 'Penghuni berhasil dicopot dari rumah']);
    }
}
