<?php

namespace App\Jobs;

use App\Models\FacilityBooking;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendBookingWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $bookingId,
        public string $decision,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        $booking = FacilityBooking::with(['facility', 'booker.resident'])->find($this->bookingId);

        if ($booking === null) {
            return;
        }

        $phone = $booking->booker?->resident?->phone_number;

        if (blank($phone)) {
            Log::info('SendBookingWhatsappJob: booker has no phone number, skipping', [
                'booking_id' => $this->bookingId,
            ]);

            return;
        }

        $verdict = $this->decision === 'approved' ? 'DISETUJUI' : 'DITOLAK';
        $message = "[SIWarga] Booking {$booking->facility->name} {$booking->start_at->format('d M Y H:i')}: {$verdict}.";

        try {
            $sent = $wahaService->sendMessage($phone, $message);

            if (! $sent) {
                Log::warning('SendBookingWhatsappJob: WAHA rejected the message', [
                    'booking_id' => $this->bookingId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendBookingWhatsappJob: send failed', [
                'booking_id' => $this->bookingId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
