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
        $query = House::query();

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('house_number', 'like', "%{$request->search}%")
                    ->orWhere('address', 'like', "%{$request->search}%");
            });
        }

        return HouseResource::collection($query->paginate($request->per_page ?? 10));
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
}
