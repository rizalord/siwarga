<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TicketStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public int $ticketId,
        public string $ticketTitle,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
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
        return [
            'ticket_id' => $this->ticketId,
            'title' => $this->ticketTitle,
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
        ];
    }
}
