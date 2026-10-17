<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CameraSnapshotStored extends Notification
{
    use Queueable;

    public function __construct(
        public int $snapshotId,
        public string $cameraName,
        public string $eventType,
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
            'snapshot_id' => $this->snapshotId,
            'title' => 'Snapshot CCTV',
            'old_status' => 'none',
            'new_status' => $this->eventType,
            'actor_name' => $this->cameraName,
        ];
    }
}
