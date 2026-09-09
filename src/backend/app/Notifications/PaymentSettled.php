<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentSettled extends Notification
{
    use Queueable;

    public function __construct(
        public int $transactionId,
        public string $oldStatus,
        public string $newStatus,
        public string $actorName,
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
        return [
            'transaction_id' => $this->transactionId,
            'title' => 'Pembayaran Tagihan',
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'actor_name' => $this->actorName,
            'amount' => $this->amount,
        ];
    }
}
