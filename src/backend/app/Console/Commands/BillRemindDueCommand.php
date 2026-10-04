<?php

namespace App\Console\Commands;

use App\Jobs\SendBillReminderWhatsappJob;
use App\Models\Bill;
use App\Models\User;
use App\Notifications\BillDueReminder;
use Illuminate\Console\Command;

class BillRemindDueCommand extends Command
{
    protected $signature = 'bills:remind-due {--days=3 : Jumlah hari sebelum jatuh tempo}';

    protected $description = 'Kirim pengingat tagihan belum lunas yang jatuh tempo H-N (in-app + WhatsApp)';

    public function handle(): int
    {
        $dueDate = now()->addDays((int) $this->option('days'))->toDateString();
        $sent = 0;

        Bill::query()
            ->with(['resident', 'dueType'])
            ->where('status', 'belum_lunas')
            ->whereDate('period_end', $dueDate)
            ->chunkById(100, function ($bills) use (&$sent, $dueDate) {
                foreach ($bills as $bill) {
                    $notification = new BillDueReminder(
                        $bill->id,
                        $bill->dueType->name ?? 'Iuran',
                        $dueDate,
                        (float) $bill->amount_due,
                    );

                    User::where('resident_id', $bill->resident_id)
                        ->where('is_active', true)
                        ->get()
                        ->each->notify($notification);

                    $phone = $bill->resident?->phone_number;
                    if (filled($phone)) {
                        $amount = number_format((float) $bill->amount_due, 0, ',', '.');
                        SendBillReminderWhatsappJob::dispatch(
                            $bill->id,
                            $phone,
                            "[SIWarga] Pengingat: tagihan {$notification->dueTypeName} sebesar Rp{$amount} jatuh tempo {$dueDate}. Abaikan jika sudah membayar.",
                        );
                    }

                    $sent++;
                }
            });

        $this->info("reminded={$sent} due_date={$dueDate}");

        return self::SUCCESS;
    }
}
