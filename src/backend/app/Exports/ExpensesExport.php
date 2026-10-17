<?php

namespace App\Exports;

use App\Models\Expense;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * @implements FromCollection<int, Expense>
 * @implements WithMapping<Expense>
 */
class ExpensesExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection<int, Expense>
     */
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
     * @param  Expense  $expense
     * @return array<int, mixed>
     */
    public function map(mixed $expense): array
    {
        return [
            $expense->category?->name,
            $expense->description,
            $expense->amount,
            $expense->expense_date->format('Y-m-d'),
        ];
    }
}
