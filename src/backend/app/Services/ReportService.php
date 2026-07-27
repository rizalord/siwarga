<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Payment;
use Carbon\Carbon;

class ReportService
{
    public function yearlySummary(int $year): array
    {
        $totalIncome = Payment::whereYear('payment_date', $year)->sum('amount_paid');
        $totalExpense = Expense::whereYear('expense_date', $year)->sum('amount');

        return [
            'year' => $year,
            'total_income' => (float) $totalIncome,
            'total_expense' => (float) $totalExpense,
            'balance' => (float) ($totalIncome - $totalExpense),
        ];
    }

    public function monthlyDetail(int $year, int $month): array
    {
        $startDate = Carbon::createFromDate($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth();

        $payments = Payment::whereBetween('payment_date', [$startDate, $endDate])
            ->with('bill.dueType')
            ->get();

        $expenses = Expense::whereBetween('expense_date', [$startDate, $endDate])->get();

        $totalIncome = $payments->sum('amount_paid');
        $totalExpense = $expenses->sum('amount');

        return [
            'year' => $year,
            'month' => $month,
            'total_income' => (float) $totalIncome,
            'total_expense' => (float) $totalExpense,
            'balance' => (float) ($totalIncome - $totalExpense),
            'payments' => $payments,
            'expenses' => $expenses,
        ];
    }
}
