<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BookingDecided extends Notification
{
    use Queueable;

    public function __construct(
        public int $bookingId,
        public string $facilityName,
        public string $startAt,
        public string $decision,
        public string $actorName,
        public ?string $reason = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        // Booking-specific keys plus generic display keys (title/old_status/
        // new_status) so the Fase 2 notifications page and bell render this
        // payload without UI changes: title contains the facility name.
        return [
            'booking_id' => $this->bookingId,
            'facility_name' => $this->facilityName,
            'start_at' => $this->startAt,
            'decision' => $this->decision,
            'actor_name' => $this->actorName,
            'reason' => $this->reason,
            'title' => "Booking {$this->facilityName}",
            'old_status' => 'pending',
            'new_status' => $this->decision,
        ];
    }
}
