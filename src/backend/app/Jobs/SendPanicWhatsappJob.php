<?php

namespace App\Jobs;

use App\Models\PanicAlert;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPanicWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $alertId,
        public string $newStatus,
        public ?int $recipientId = null,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        $alert = PanicAlert::with(['reporter.resident', 'house'])->find($this->alertId);

        if ($alert === null) {
            return;
        }

        $recipient = $this->recipientId !== null
            ? User::with('resident')->find($this->recipientId)
            : $alert->reporter;

        $phone = $recipient?->resident?->phone_number;

        if (blank($phone)) {
            Log::info('SendPanicWhatsappJob: recipient has no phone number, skipping', [
                'alert_id' => $this->alertId,
                'recipient_id' => $recipient?->id,
            ]);

            return;
        }

        $label = [
            'active' => 'DARURAT BARU',
            'handled' => 'SEDANG DITANGANI',
            'resolved' => 'SELESAI',
            'cancelled' => 'DIBATALKAN',
        ][$this->newStatus] ?? strtoupper($this->newStatus);

        $where = $alert->house?->house_number ?? $alert->location_note ?? '-';
        $message = "[SIWarga] Panic alert #{$alert->id} ({$where}): {$label}.";

        try {
            $sent = $wahaService->sendMessage($phone, $message);

            if (! $sent) {
                Log::warning('SendPanicWhatsappJob: WAHA rejected the message', [
                    'alert_id' => $this->alertId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendPanicWhatsappJob: send failed', [
                'alert_id' => $this->alertId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
