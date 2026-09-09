<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PatrolScheduleResource;
use App\Models\PatrolSchedule;
use App\Services\HtmlSanitizer;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PatrolScheduleController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    public function index(Request $request)
    {
        $query = PatrolSchedule::query();

        if ($request->filled('from')) {
            $query->where('date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('date', '<=', $request->to);
        }

        $this->applySorting($query, $request, ['date', 'shift', 'created_at'], 'date', 'asc');

        return $this->paginated($query->paginate($request->per_page ?? 10), PatrolScheduleResource::class);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSchedule($request);

        return (new PatrolScheduleResource(PatrolSchedule::create($validated)))->response()->setStatusCode(201);
    }

    public function show(PatrolSchedule $patrolSchedule)
    {
        return new PatrolScheduleResource($patrolSchedule);
    }

    public function update(Request $request, PatrolSchedule $patrolSchedule)
    {
        $this->authorize('update', $patrolSchedule);

        $patrolSchedule->update($this->validateSchedule($request, $patrolSchedule->id));

        return new PatrolScheduleResource($patrolSchedule->fresh());
    }

    public function destroy(PatrolSchedule $patrolSchedule)
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

        $validated = $request->validate([
            'date' => [$required, 'date'],
            'shift' => [$required, Rule::in(['pagi', 'siang', 'malam'])],
            'personnel_name' => [$required, 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'area' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string'],
        ]);

        foreach (['personnel_name', 'area', 'note'] as $field) {
            if (isset($validated[$field]) && $validated[$field] !== null) {
                $validated[$field] = $this->htmlSanitizer->sanitize($validated[$field]);
            }
        }

        $date = $validated['date'] ?? PatrolSchedule::whereKey($exceptId)->value('date');
        $shift = $validated['shift'] ?? PatrolSchedule::whereKey($exceptId)->value('shift');

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
