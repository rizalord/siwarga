<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTicketWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $ticketId,
        public string $oldStatus,
        public string $newStatus,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        $ticket = Ticket::with('reporter.resident')->find($this->ticketId);

        if ($ticket === null) {
            return;
        }

        $phone = $ticket->reporter?->resident?->phone_number;

        if (blank($phone)) {
            Log::info('SendTicketWhatsappJob: reporter has no phone number, skipping', [
                'ticket_id' => $this->ticketId,
            ]);

            return;
        }

        $message = "[SIWarga] Tiket #{$ticket->id} ({$ticket->title}): {$this->oldStatus} → {$this->newStatus}.";

        try {
            $sent = $wahaService->sendMessage($phone, $message);

            if (! $sent) {
                Log::warning('SendTicketWhatsappJob: WAHA rejected the message', [
                    'ticket_id' => $this->ticketId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendTicketWhatsappJob: send failed', [
                'ticket_id' => $this->ticketId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
