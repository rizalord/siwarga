<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\Payment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    /**
     * Requires BillSeeder to have run first.
     *
     * Melunaskan sekitar 70% tagihan yang sudah dibuat, kecuali bulan berjalan.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@siwarga.test')->first();
        $startOfMonth = Carbon::now()->startOfMonth();

        $payableBills = Bill::where('period_start', '<', $startOfMonth)->get();

        $payableBills->random((int) ($payableBills->count() * 0.7))
            ->each(function (Bill $bill) use ($admin) {
                Payment::create([
                    'bill_id' => $bill->id,
                    'amount_paid' => $bill->amount_due,
                    'payment_date' => Carbon::parse($bill->period_start)->addDays(5),
                    'notes' => 'Dibayar tunai ke bendahara',
                    'created_by' => $admin?->id,
                ]);
                $bill->update(['status' => 'lunas']);
            });
    }
}
