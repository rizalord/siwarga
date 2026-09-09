<?php

namespace App\Http\Controllers\Api;

use App\Exports\BillsExport;
use App\Exports\ExpensesExport;
use App\Exports\HousesExport;
use App\Exports\PaymentsExport;
use App\Exports\ResidentsExport;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\BackupService;
use App\Services\ReportPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const DATASET_GATES = [
        'residents' => 'residents.view',
        'houses' => 'houses.view',
        'bills' => 'reports.view',
        'payments' => 'reports.view',
        'expenses' => 'reports.view',
    ];

    public function __construct(
        private ReportPdfService $reportPdfService,
        private BackupService $backupService,
    ) {}

    public function monthlyPdf(int $year, int $month)
    {
        if ($year < 2020) {
            abort(422, 'Tahun tidak valid.');
        }

        if ($month < 1 || $month > 12) {
            abort(404);
        }

        $pdf = $this->reportPdfService->monthly($year, $month);
        $filename = "laporan-bulanan-{$year}-{$month}.pdf";

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'export.laporan',
            'description' => "Mengunduh laporan bulanan {$year}-{$month} (PDF)",
            'ip_address' => request()->ip(),
            'url' => request()->fullUrl(),
        ]);

        return response()->streamDownload(
            fn () => print ($pdf->output()),
            $filename,
            ['Content-Type' => 'application/pdf'],
        );
    }

    public function summaryPdf(int $year)
    {
        if ($year < 2020) {
            abort(422, 'Tahun tidak valid.');
        }

        $pdf = $this->reportPdfService->summary($year);
        $filename = "laporan-tahunan-{$year}.pdf";

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'export.laporan',
            'description' => "Mengunduh laporan tahunan {$year} (PDF)",
            'ip_address' => request()->ip(),
            'url' => request()->fullUrl(),
        ]);

        return response()->streamDownload(
            fn () => print ($pdf->output()),
            $filename,
            ['Content-Type' => 'application/pdf'],
        );
    }

    public function dataset(Request $request, string $dataset): BinaryFileResponse
    {
        if (! array_key_exists($dataset, self::DATASET_GATES)) {
            abort(404);
        }

        Gate::authorize(self::DATASET_GATES[$dataset]);

        $validated = $request->validate([
            'month' => 'nullable|integer|min:1|max:12',
            'year' => 'nullable|integer|min:2000|max:2100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $export = match ($dataset) {
            'residents' => new ResidentsExport,
            'houses' => new HousesExport,
            'bills' => new BillsExport(
                isset($validated['month']) ? (int) $validated['month'] : null,
                isset($validated['year']) ? (int) $validated['year'] : null,
            ),
            'payments' => new PaymentsExport,
            'expenses' => new ExpensesExport,
        };

        $response = Excel::download($export, "export-{$dataset}-".now()->format('Y-m-d').'.xlsx');

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'export.data',
            'description' => "Mengunduh export {$dataset} (Excel)",
            'ip_address' => $request->ip(),
            'url' => $request->fullUrl(),
        ]);

        return $response;
    }

    public function backup(Request $request)
    {
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'backup.json',
            'description' => 'Mengunduh backup JSON seluruh data',
            'ip_address' => $request->ip(),
            'url' => $request->fullUrl(),
        ]);

        return response()->json(['data' => $this->backupService->dump()]);
    }
}
