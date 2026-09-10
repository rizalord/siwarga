<?php

namespace App\Console\Commands;

use App\Services\CameraIngestService;
use Illuminate\Console\Command;

class CameraIngestCommand extends Command
{
    protected $signature = 'camera:ingest {--camera= : ID kamera tertentu (opsional)}';

    protected $description = 'Ingest file FTP CCTV dari inbox ke snapshot log';

    public function handle(CameraIngestService $ingest): int
    {
        $cameraId = $this->option('camera') !== null ? (int) $this->option('camera') : null;
        $summary = $ingest->ingest($cameraId);
        $this->info("processed={$summary['processed']} skipped={$summary['skipped']} quarantined={$summary['quarantined']}");

        return self::SUCCESS;
    }
}
