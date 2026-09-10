<?php

namespace App\Services;

use App\Jobs\SendCameraWhatsappJob;
use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Models\PanicAlert;
use App\Models\User;
use App\Notifications\CameraSnapshotStored;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CameraIngestService
{
    public const ALLOWED_MIMES = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'mp4' => 'video/mp4',
    ];

    public const MAX_BYTES = 25 * 1024 * 1024;

    /**
     * @return array{processed: int, skipped: int, quarantined: int}
     */
    public function ingest(?int $cameraId = null): array
    {
        $summary = ['processed' => 0, 'skipped' => 0, 'quarantined' => 0];
        $disk = Storage::disk('public');
        $inbox = trim((string) config('cctv.inbox_path', 'ftp-inbox'), '/');

        $cameras = Camera::where('is_active', true)
            ->when($cameraId, fn ($query) => $query->whereKey($cameraId))
            ->get();

        foreach ($cameras as $camera) {
            foreach ($this->pendingFiles($disk, $inbox, $camera) as $path) {
                $summary[$this->ingestFile($disk, $inbox, $camera, $path)]++;
            }
        }

        return $summary;
    }

    /**
     * @return array<int, string>
     */
    private function pendingFiles(FilesystemAdapter $disk, string $inbox, Camera $camera): array
    {
        $dir = "{$inbox}/{$camera->ftp_user}";

        if (! $disk->directoryExists($dir)) {
            return [];
        }

        return collect($disk->files($dir))
            ->reject(fn ($path) => str_contains($path, '/.done/') || str_contains($path, '/.quarantine/'))
            ->values()->all();
    }

    private function ingestFile(FilesystemAdapter $disk, string $inbox, Camera $camera, string $path): string
    {
        $hash = hash('sha256', $path.'|'.$disk->size($path));

        if (CameraSnapshot::where('source_hash', $hash)->exists()) {
            $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.done/".basename($path));

            return 'skipped';
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (! isset(self::ALLOWED_MIMES[$extension]) || $disk->size($path) > self::MAX_BYTES) {
            $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.quarantine/".basename($path));
            Log::warning('CameraIngestService: quarantined file', ['path' => $path]);

            return 'quarantined';
        }

        // Copy first (source stays until success), then archive the original.
        $stored = "camera-snapshots/{$camera->id}/{$hash}-".basename($path);
        $disk->copy($path, $stored);

        $snapshot = CameraSnapshot::create([
            'camera_id' => $camera->id,
            'file_path' => $stored,
            'mime' => self::ALLOWED_MIMES[$extension],
            'size_bytes' => $disk->size($stored),
            'event_type' => $this->resolveEventType(),
            'captured_at' => now(),
            'source_hash' => $hash,
        ]);

        $this->moveTo($disk, $path, "{$inbox}/{$camera->ftp_user}/.done/".basename($path));
        $this->notifyStaff($snapshot->fresh('camera'));

        return 'processed';
    }

    private function moveTo(FilesystemAdapter $disk, string $from, string $to): void
    {
        $disk->makeDirectory(dirname($to));
        $disk->move($from, $to);
    }

    private function resolveEventType(): string
    {
        $recentPanic = PanicAlert::where('status', PanicAlert::STATUS_ACTIVE)
            ->where('created_at', '>=', now()->subMinutes(5))
            ->exists();

        return $recentPanic ? CameraSnapshot::EVENT_PANIC : CameraSnapshot::EVENT_MOTION;
    }

    private function notifyStaff(CameraSnapshot $snapshot): void
    {
        $staff = User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->get();

        foreach ($staff as $member) {
            try {
                $member->notify(new CameraSnapshotStored(
                    $snapshot->id,
                    $snapshot->camera->name,
                    $snapshot->event_type,
                ));
            } catch (\Throwable $exception) {
                Log::warning('CameraIngestService: failed to store snapshot notification', [
                    'snapshot_id' => $snapshot->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        // WA only for panic-correlated snapshots, dispatched after the row exists.
        if ($snapshot->event_type === CameraSnapshot::EVENT_PANIC) {
            SendCameraWhatsappJob::dispatch($snapshot->id);
        }
    }
}
