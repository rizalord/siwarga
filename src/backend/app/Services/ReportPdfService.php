<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;

class ReportPdfService
{
    public function __construct(private ReportService $reportService) {}

    public function monthly(int $year, int $month): DomPdf
    {
        $data = $this->reportService->monthlyDetail($year, $month);

        return Pdf::loadView('reports.monthly-pdf', ['data' => $data])
            ->setPaper('a4', 'portrait');
    }

    public function summary(int $year): DomPdf
    {
        $data = $this->reportService->yearlySummary($year);

        return Pdf::loadView('reports.summary-pdf', ['data' => $data])
            ->setPaper('a4', 'portrait');
    }
}
