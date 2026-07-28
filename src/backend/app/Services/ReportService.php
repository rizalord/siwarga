<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Payment;
use Carbon\Carbon;

class ReportService
{
    public function yearlySummary(int $year): array
    {
        $monthlyData = [];
        $yearBalance = 0.0;

        for ($month = 1; $month <= 12; $month++) {
            $income = (float) Payment::whereYear('payment_date', $year)
                ->whereMonth('payment_date', $month)
                ->sum('amount_paid');

            $expense = (float) Expense::whereYear('expense_date', $year)
                ->whereMonth('expense_date', $month)
                ->sum('amount');

            $balance = $income - $expense;
            $yearBalance += $balance;

            $monthlyData[] = [
                'month' => $month,
                'total_income' => $income,
                'total_expense' => $expense,
                'balance' => $balance,
            ];
        }

        return [
            'year' => $year,
            'monthly_data' => $monthlyData,
            'year_balance' => $yearBalance,
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
