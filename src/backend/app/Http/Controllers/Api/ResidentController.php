<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ResidentResource;
use App\Models\Resident;
use Illuminate\Http\Request;

class ResidentController extends Controller
{
    public function index(Request $request)
    {
        $query = Resident::query();

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            $query->where('full_name', 'like', "%{$request->search}%");
        }

        return ResidentResource::collection($query->paginate($request->per_page ?? 10));
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

        if ($request->hasFile('ktp_photo')) {
            $validated['ktp_photo_path'] = $request->file('ktp_photo')->store('ktp-photos', 'public');
        }

        $resident = Resident::create($validated);

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

        if ($request->hasFile('ktp_photo')) {
            $validated['ktp_photo_path'] = $request->file('ktp_photo')->store('ktp-photos', 'public');
        }

        $resident->update($validated);

        return new ResidentResource($resident);
    }

    public function destroy(Resident $resident)
    {
        $resident->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
