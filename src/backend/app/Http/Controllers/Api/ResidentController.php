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

        if ($request->filled('status')) {
            is_array($request->status)
                ? $query->whereIn('status', $request->status)
                : $query->where('status', $request->status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('full_name', 'like', "%{$request->search}%")
                    ->orWhere('phone_number', 'like', "%{$request->search}%");
            });
        }

        return $this->paginated($query->paginate($request->per_page ?? 10), ResidentResource::class);
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
