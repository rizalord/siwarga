<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PatrolScheduleResource;
use App\Models\PatrolSchedule;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatrolScheduleController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function index(Request $request): JsonResponse
    {
        $query = PatrolSchedule::query();

        if ($request->filled('from')) {
            $query->where('date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('date', '<=', $request->to);
        }

        $this->applySorting($query, $request, ['date', 'shift', 'created_at'], 'date', 'asc');

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), PatrolScheduleResource::class);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateSchedule($request);

        return (new PatrolScheduleResource(PatrolSchedule::create($validated)))->response()->setStatusCode(201);
    }

    public function show(PatrolSchedule $patrolSchedule): PatrolScheduleResource
    {
        return new PatrolScheduleResource($patrolSchedule);
    }

    public function update(Request $request, PatrolSchedule $patrolSchedule): PatrolScheduleResource
    {
        $this->authorize('update', $patrolSchedule);

        $patrolSchedule->update($this->validateSchedule($request, $patrolSchedule->id));

        return new PatrolScheduleResource($patrolSchedule->refresh());
    }

    public function destroy(PatrolSchedule $patrolSchedule): JsonResponse
    {
        $this->authorize('delete', $patrolSchedule);
        $patrolSchedule->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSchedule(Request $request, ?int $exceptId = null): array
    {
        $required = $exceptId === null ? 'required' : 'sometimes';

        $validated = $this->validate($request, [
            'date' => [$required, 'date'],
            'shift' => [$required, Rule::in(['pagi', 'siang', 'malam'])],
            'personnel_name' => [$required, 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'area' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string'],
        ]);

        foreach (['personnel_name', 'area', 'note'] as $field) {
            if (isset($validated[$field]) && is_string($validated[$field])) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $existing = $exceptId !== null ? PatrolSchedule::query()->find($exceptId) : null;
        $date = $request->filled('date') ? $request->string('date')->toString() : $existing?->date;
        $shift = $request->filled('shift') ? $request->string('shift')->toString() : $existing?->shift;

        $conflict = PatrolSchedule::whereDate('date', $date)
            ->where('shift', $shift)
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'shift' => ['Shift ini sudah terisi pada tanggal tersebut.'],
            ]);
        }

        return $validated;
    }
}
