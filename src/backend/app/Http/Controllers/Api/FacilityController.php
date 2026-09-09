<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FacilityResource;
use App\Models\Facility;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function index(Request $request)
    {
        $query = Facility::query()->with('dueType:id,name');

        if (! $request->user()->hasPermission('facilities.manage')) {
            $query->where('is_active', true);
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['name', 'rental_fee', 'created_at']);

        return $this->paginated($query->paginate($request->per_page ?? 10), FacilityResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'rental_fee' => ['nullable', 'numeric', 'min:0'],
            'due_type_id' => ['nullable', 'integer', 'exists:due_types,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('description', $validated) && $validated['description'] !== null) {
            $validated['description'] = $this->htmlSanitizer->sanitize($validated['description']);
        }

        return (new FacilityResource(Facility::create($validated)))->response()->setStatusCode(201);
    }

    public function show(Facility $facility)
    {
        return new FacilityResource($facility->load('dueType'));
    }

    public function update(Request $request, Facility $facility)
    {
        $this->authorize('update', $facility);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'rental_fee' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'due_type_id' => ['sometimes', 'nullable', 'integer', 'exists:due_types,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('description', $validated) && $validated['description'] !== null) {
            $validated['description'] = $this->htmlSanitizer->sanitize($validated['description']);
        }

        $facility->update($validated);

        return new FacilityResource($facility->fresh('dueType'));
    }

    public function destroy(Facility $facility)
    {
        $this->authorize('delete', $facility);
        $facility->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
