<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\FacilityBooking;
use App\Services\BookingService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private BookingService $bookingService) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $query = FacilityBooking::query()->with(['facility:id,name', 'booker:id,name']);

        if (! $user->hasPermission('bookings.review')) {
            $query->where('booked_by', $user->id);
        }

        if ($request->filled('facility_id')) {
            $query->where('facility_id', $request->facility_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->where('end_at', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('start_at', '<=', $request->to);
        }

        $this->applySorting($query, $request, ['start_at', 'created_at', 'status'], 'start_at');

        return $this->paginated($query->paginate($request->per_page ?? 10), BookingResource::class);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'facility_id' => ['required', 'integer', 'exists:facilities,id'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'start_at' => ['required', 'date', 'after:now'],
            'end_at' => ['required', 'date', 'after:start_at'],
        ]);

        $booking = $this->bookingService->request($validated, $request->user());

        return (new BookingResource($booking->load(['facility', 'booker'])))->response()->setStatusCode(201);
    }

    public function show(FacilityBooking $booking)
    {
        $this->authorize('view', $booking);

        return new BookingResource($booking->load(['facility', 'booker', 'approver']));
    }

    public function approve(Request $request, FacilityBooking $booking)
    {
        $this->authorize('review', $booking);

        return new BookingResource($this->bookingService->approve($booking, $request->user()));
    }

    public function reject(Request $request, FacilityBooking $booking)
    {
        $this->authorize('review', $booking);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        return new BookingResource($this->bookingService->reject($booking, $validated['reason'] ?? null, $request->user()));
    }

    public function cancel(FacilityBooking $booking)
    {
        $this->authorize('cancel', $booking);

        return new BookingResource($this->bookingService->cancel($booking));
    }
}
