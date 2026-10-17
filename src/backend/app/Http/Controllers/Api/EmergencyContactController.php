<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmergencyContactResource;
use App\Models\EmergencyContact;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmergencyContactController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $contacts = EmergencyContact::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->integer('per_page') ?: 50);

        return $this->paginated($contacts, EmergencyContactResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'sort_order' => ['sometimes', 'integer'],
        ]);

        return (new EmergencyContactResource(EmergencyContact::create($validated)))->response()->setStatusCode(201);
    }

    public function update(Request $request, EmergencyContact $emergencyContact): EmergencyContactResource
    {
        $this->authorize('update', $emergencyContact);

        $emergencyContact->update($this->validate($request, [
            'name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'sort_order' => ['sometimes', 'integer'],
        ]));

        return new EmergencyContactResource($emergencyContact->refresh());
    }

    public function destroy(EmergencyContact $emergencyContact): JsonResponse
    {
        $this->authorize('delete', $emergencyContact);
        $emergencyContact->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
