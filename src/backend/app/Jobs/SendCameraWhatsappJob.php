<?php

namespace App\Jobs;

use App\Models\CameraSnapshot;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendCameraWhatsappJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $snapshotId) {}

    public function handle(WahaService $wahaService): void
    {
        $snapshot = CameraSnapshot::with('camera')->find($this->snapshotId);

        if ($snapshot === null) {
            return;
        }

        $staff = User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->with('resident')
            ->get();

        foreach ($staff as $member) {
            $phone = $member->resident?->phone_number;

            if (blank($phone)) {
                continue;
            }

            try {
                $wahaService->sendMessage(
                    $phone,
                    "[SIWarga] Snapshot PANIC dari {$snapshot->camera->name} ({$snapshot->captured_at?->format('d M Y H:i')}). Cek galeri CCTV."
                );
            } catch (\Throwable $exception) {
                Log::warning('SendCameraWhatsappJob: send failed', [
                    'snapshot_id' => $this->snapshotId,
                    'error' => $exception->getMessage(),
                ]);
            }
        }
    }
}
