<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GuestLogResource;
use App\Models\GuestLog;
use App\Services\GuestLogService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class GuestLogController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private GuestLogService $guestLogService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = GuestLog::query()->with(['house:id,house_number', 'registrar:id,name']);

        if (! $user->hasPermission('guest-logs.manage')) {
            $query->where('registered_by', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('visit_date', $request->date);
        }

        if ($request->search) {
            $query->where('guest_name', 'like', "%{$request->search}%");
        }

        $this->applySorting($query, $request, ['visit_date', 'created_at', 'status']);

        return $this->paginated($query->paginate($request->per_page ?? 10), GuestLogResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:100'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'house_id' => ['required', 'integer', 'exists:houses,id'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'visit_date' => ['nullable', 'date'],
        ]);

        $log = $this->guestLogService->register($validated, $request->user());

        return (new GuestLogResource($log->load(['house', 'registrar'])))->response()->setStatusCode(201);
    }

    public function show(GuestLog $guestLog)
    {
        $this->authorize('view', $guestLog);

        return new GuestLogResource($guestLog->load(['house', 'registrar', 'recorder']));
    }

    public function checkIn(GuestLog $guestLog)
    {
        $this->authorize('checkIn', $guestLog);

        return new GuestLogResource($this->guestLogService->checkIn($guestLog, request()->user()));
    }

    public function checkOut(GuestLog $guestLog)
    {
        $this->authorize('checkOut', $guestLog);

        return new GuestLogResource($this->guestLogService->checkOut($guestLog));
    }
}
