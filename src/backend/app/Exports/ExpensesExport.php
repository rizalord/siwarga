<?php

namespace App\Exports;

use App\Models\Expense;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ExpensesExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection(): Collection
    {
        return Expense::with('category')->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['Kategori', 'Deskripsi', 'Jumlah', 'Tanggal Pengeluaran'];
    }

    /**
     * @param  mixed  $expense
     * @return array<int, mixed>
     */
    public function map($expense): array
    {
        return [
            $expense->category?->name,
            $expense->description,
            $expense->amount,
            optional($expense->expense_date)->format('Y-m-d'),
        ];
    }
}
