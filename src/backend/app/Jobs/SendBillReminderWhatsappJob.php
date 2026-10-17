<?php

namespace App\Jobs;

use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendBillReminderWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $billId,
        public string $phone,
        public string $message,
    ) {}

    public function handle(WahaService $wahaService): void
    {
        try {
            if (! $wahaService->sendMessage($this->phone, $this->message)) {
                Log::warning('SendBillReminderWhatsappJob: WAHA rejected the message', [
                    'bill_id' => $this->billId,
                ]);
            }
        } catch (\Throwable $exception) {
            Log::warning('SendBillReminderWhatsappJob: send failed', [
                'bill_id' => $this->billId,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
