<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

class ReportService
{
    /**
     * @return array{year: int, monthly_data: list<array{month: int, total_income: float, total_expense: float, balance: float}>, year_balance: float}
     */
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

    /**
     * @return array{year: int, month: int, total_income: float, total_expense: float, balance: float, payments: Collection<int, Payment>, expenses: Collection<int, Expense>}
     */
    public function monthlyDetail(int $year, int $month): array
    {
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfDay();
        $endDate = $startDate->copy()->endOfMonth()->endOfDay();

        $payments = Payment::whereBetween('payment_date', [$startDate, $endDate])
            ->with('bill.dueType')
            ->get();

        $expenses = Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->with('category')
            ->get();

        $totalIncome = $payments->sum(fn (Payment $payment): float => (float) $payment->amount_paid);
        $totalExpense = $expenses->sum(fn (Expense $expense): float => (float) $expense->amount);

        return [
            'year' => $year,
            'month' => $month,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'balance' => $totalIncome - $totalExpense,
            'payments' => $payments,
            'expenses' => $expenses,
        ];
    }
}
