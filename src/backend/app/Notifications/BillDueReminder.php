<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BillDueReminder extends Notification
{
    use Queueable;

    public function __construct(
        public int $billId,
        public string $dueTypeName,
        public string $dueDate,
        public float $amount,
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
        // Generic display keys (title/old_status/new_status/actor_name) keep the
        // existing notifications page and bell rendering this without UI changes.
        return [
            'bill_id' => $this->billId,
            'due_date' => $this->dueDate,
            'amount' => $this->amount,
            'title' => "Tagihan {$this->dueTypeName} jatuh tempo {$this->dueDate}",
            'old_status' => 'belum_lunas',
            'new_status' => 'jatuh_tempo',
            'actor_name' => 'Sistem',
        ];
    }
}
