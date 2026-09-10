<?php

namespace App\Console\Commands;

use App\Models\Camera;
use App\Models\CameraSnapshot;
use App\Services\CameraIngestService;
use Illuminate\Console\Command;

class CameraSimulateCommand extends Command
{
    protected $signature = 'camera:simulate {camera : ID kamera} {--count=1 : jumlah file}';

    protected $description = 'Tulis file dummy ke inbox kamera lalu ingest (dev only)';

    public function handle(CameraIngestService $ingest): int
    {
        abort_unless(app()->environment('local', 'testing'), 403, 'Simulasi hanya di non-production.');

        $camera = Camera::findOrFail($this->argument('camera'));
        $count = min((int) $this->option('count'), 5);

        $ingest->writeSimulatedFiles($camera, $count);
        $summary = $ingest->ingest($camera->id, CameraSnapshot::EVENT_SIMULATED);
        $this->info("processed={$summary['processed']}");

        return self::SUCCESS;
    }
}
