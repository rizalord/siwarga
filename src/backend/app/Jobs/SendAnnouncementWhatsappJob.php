<?php

namespace App\Jobs;

use App\Models\Announcement;
use App\Models\Resident;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class SendAnnouncementWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public Announcement $announcement) {}

    public function handle(WahaService $wahaService): void
    {
        $residents = $this->resolveRecipients();
        $message = $this->buildMessage();

        foreach ($residents as $resident) {
            try {
                $sent = $wahaService->sendMessage($resident->phone_number, $message);

                if (! $sent) {
                    Log::warning('SendAnnouncementWhatsappJob: WAHA rejected the message', [
                        'announcement_id' => $this->announcement->id,
                        'resident_id' => $resident->id,
                    ]);
                }
            } catch (\Throwable $exception) {
                Log::warning('SendAnnouncementWhatsappJob: send failed', [
                    'announcement_id' => $this->announcement->id,
                    'resident_id' => $resident->id,
                    'error' => $exception->getMessage(),
                ]);
            }

            sleep(1);
        }
    }

    /**
     * @return Collection<int, Resident>
     */
    private function resolveRecipients()
    {
        if ($this->announcement->targets()->exists()) {
            $houseIds = $this->announcement->targets()->pluck('house_id')->filter();

            return Resident::query()
                ->whereHas('houses', fn ($query) => $query->whereIn('houses.id', $houseIds)->whereNull('house_residents.end_date'))
                ->whereNotNull('phone_number')
                ->get();
        }

        return Resident::query()->whereNotNull('phone_number')->get();
    }

    private function buildMessage(): string
    {
        $excerpt = trim(strip_tags($this->announcement->content));

        return "{$this->announcement->title}\n\n{$excerpt}";
    }
}
