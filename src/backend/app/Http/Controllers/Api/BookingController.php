<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Services\BookingService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private BookingService $bookingService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $this->authUser($request);
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

        return $this->paginated($query->paginate($request->integer('per_page') ?: 10), BookingResource::class);
    }

    public function indexByFacility(Request $request, Facility $facility): JsonResponse
    {
        $request->merge(['facility_id' => $facility->id]);

        return $this->index($request);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, [
            'facility_id' => ['required', 'integer', 'exists:facilities,id'],
            'event_id' => ['nullable', 'integer', 'exists:events,id'],
            'start_at' => ['required', 'date', 'after:now'],
            'end_at' => ['required', 'date', 'after:start_at'],
        ]);

        $booking = $this->bookingService->request($validated, $this->authUser($request));

        return (new BookingResource($booking->load(['facility', 'booker'])))->response()->setStatusCode(201);
    }

    public function show(FacilityBooking $booking): BookingResource
    {
        $this->authorize('view', $booking);

        return new BookingResource($booking->load(['facility', 'booker', 'approver']));
    }

    public function approve(Request $request, FacilityBooking $booking): BookingResource
    {
        $this->authorize('review', $booking);

        return new BookingResource($this->bookingService->approve($booking, $this->authUser($request)));
    }

    public function reject(Request $request, FacilityBooking $booking): BookingResource
    {
        $this->authorize('review', $booking);

        $this->validate($request, [
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        return new BookingResource($this->bookingService->reject($booking, $this->optionalString($request, 'reason'), $this->authUser($request)));
    }

    public function cancel(FacilityBooking $booking): BookingResource
    {
        $this->authorize('cancel', $booking);

        return new BookingResource($this->bookingService->cancel($booking));
    }
}
