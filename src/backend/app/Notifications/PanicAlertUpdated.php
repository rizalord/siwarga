<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PanicAlertUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public int $alertId,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
        public ?string $locationNote = null,
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
            'alert_id' => $this->alertId,
            'title' => 'Panic Alert',
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
            'location_note' => $this->locationNote,
        ];
    }
}
