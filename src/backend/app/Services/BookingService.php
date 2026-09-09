<?php

namespace App\Services;

use App\Jobs\SendBookingWhatsappJob;
use App\Models\Bill;
use App\Models\Facility;
use App\Models\FacilityBooking;
use App\Models\HouseResident;
use App\Models\User;
use App\Notifications\BookingDecided;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function request(array $data, User $user): FacilityBooking
    {
        $facility = Facility::findOrFail($data['facility_id']);

        if (! $facility->is_active) {
            throw ValidationException::withMessages(['facility_id' => ['Fasilitas sedang tidak aktif.']]);
        }

        return FacilityBooking::create([...$data, 'booked_by' => $user->id]);
    }

    public function approve(FacilityBooking $booking, User $actor): FacilityBooking
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['Hanya booking pending yang bisa disetujui.']]);
        }

        $result = DB::transaction(function () use ($booking, $actor): array {
            Facility::whereKey($booking->facility_id)->lockForUpdate()->first();

            if ($this->overlaps($booking->facility_id, $booking->start_at, $booking->end_at, $booking->id)) {
                throw ValidationException::withMessages(['slot' => ['Slot sudah terisi, pilih waktu lain.']]);
            }

            $booking->update(['status' => 'approved', 'approved_by' => $actor->id]);

            $conflicts = FacilityBooking::where('facility_id', $booking->facility_id)
                ->where('status', 'pending')
                ->where('id', '!=', $booking->id)
                ->where('start_at', '<', $booking->end_at)
                ->where('end_at', '>', $booking->start_at)
                ->get();

            foreach ($conflicts as $conflict) {
                $conflict->update(['status' => 'rejected', 'approved_by' => $actor->id]);
            }

            $this->maybeBill($booking->fresh(['facility', 'booker']), $actor);

            return [
                'booking' => $booking->fresh(['facility', 'booker', 'approver']),
                'conflicts' => $conflicts->map(fn (FacilityBooking $conflict) => $conflict->fresh('facility'))->all(),
            ];
        });

        foreach ($result['conflicts'] as $conflict) {
            $this->notify($conflict, 'rejected', $actor, 'Slot bentrok dengan booking yang disetujui.');
        }

        $this->notify($result['booking'], 'approved', $actor, null);

        return FacilityBooking::with(['facility', 'booker', 'approver'])->findOrFail($result['booking']->id);
    }

    public function reject(FacilityBooking $booking, ?string $reason, User $actor): FacilityBooking
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['Hanya booking pending yang bisa ditolak.']]);
        }

        $booking->update(['status' => 'rejected', 'approved_by' => $actor->id]);
        $this->notify($booking->fresh('facility'), 'rejected', $actor, $reason);

        return $booking->fresh(['facility', 'booker', 'approver']);
    }

    public function cancel(FacilityBooking $booking): FacilityBooking
    {
        if ($booking->status !== 'pending') {
            throw ValidationException::withMessages(['status' => ['Hanya booking pending yang bisa dibatalkan.']]);
        }

        if ($booking->start_at->lte(now())) {
            throw ValidationException::withMessages(['status' => ['Booking yang sudah lewat tidak bisa dibatalkan.']]);
        }

        $booking->update(['status' => 'cancelled']);

        return $booking->fresh(['facility', 'booker', 'approver']);
    }

    public function overlaps(int $facilityId, mixed $start, mixed $end, ?int $exceptId = null): bool
    {
        return FacilityBooking::where('facility_id', $facilityId)
            ->where('status', 'approved')
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start)
            ->exists();
    }

    private function maybeBill(FacilityBooking $booking, User $actor): void
    {
        $facility = $booking->facility;

        if ($facility === null || $facility->rental_fee === null || (float) $facility->rental_fee <= 0 || $facility->due_type_id === null) {
            return;
        }

        $houseId = HouseResident::where('resident_id', $booking->booker?->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        if ($houseId === null || $booking->booked_by === null) {
            Log::warning('BookingService: approved booking has no house, skipping bill', [
                'booking_id' => $booking->id,
            ]);

            return;
        }

        $period = $booking->start_at->toDateString();

        $exists = Bill::where('due_type_id', $facility->due_type_id)
            ->where('house_id', $houseId)
            ->whereDate('period_start', $period)
            ->exists();

        if ($exists) {
            Log::warning('BookingService: bill already exists, skipping duplicate', [
                'booking_id' => $booking->id,
            ]);

            return;
        }

        Bill::create([
            'house_id' => $houseId,
            'resident_id' => $booking->booker->resident_id,
            'due_type_id' => $facility->due_type_id,
            'period_start' => $period,
            'period_end' => $period,
            'amount_due' => $facility->rental_fee,
            'status' => 'belum_lunas',
            'generated_at' => now(),
            'generated_by' => $actor->id,
        ]);
    }

    private function notify(FacilityBooking $booking, string $decision, User $actor, ?string $reason): void
    {
        $booker = $booking->booker;

        if ($booker === null) {
            return;
        }

        try {
            $booker->notify(new BookingDecided(
                $booking->id,
                $booking->facility->name,
                $booking->start_at->format('d M Y H:i'),
                $decision,
                $actor->name,
                $reason,
            ));
        } catch (\Throwable $exception) {
            Log::warning('BookingService: failed to store decision notification', [
                'booking_id' => $booking->id,
                'error' => $exception->getMessage(),
            ]);
        }

        SendBookingWhatsappJob::dispatch($booking->id, $decision);
    }
}
