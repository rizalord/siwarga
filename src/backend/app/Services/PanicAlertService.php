<?php

namespace App\Services;

use App\Jobs\SendPanicWhatsappJob;
use App\Models\HouseResident;
use App\Models\PanicAlert;
use App\Models\User;
use App\Notifications\PanicAlertUpdated;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PanicAlertService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function report(array $data, User $user): PanicAlert
    {
        $exists = PanicAlert::where('reporter_id', $user->id)
            ->where('status', PanicAlert::STATUS_ACTIVE)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['status' => ['Anda masih memiliki alert aktif. Batalkan dulu sebelum melapor lagi.']]);
        }

        foreach (['location_note', 'note'] as $field) {
            if (isset($data[$field]) && $data[$field] !== null) {
                $data[$field] = $this->htmlSanitizer->sanitize($data[$field]);
            }
        }

        $data['house_id'] ??= HouseResident::where('resident_id', $user->resident_id)
            ->whereNull('end_date')
            ->value('house_id');

        $alert = DB::transaction(function () use ($data, $user): PanicAlert {
            $alert = PanicAlert::create([...$data,
                'reporter_id' => $user->id,
                'status' => PanicAlert::STATUS_ACTIVE,
            ]);

            foreach ($this->staffRecipients() as $staff) {
                try {
                    $staff->notify(new PanicAlertUpdated(
                        $alert->id, 'none', PanicAlert::STATUS_ACTIVE, $user->name, $alert->location_note,
                    ));
                } catch (\Throwable $exception) {
                    Log::warning('PanicAlertService: failed to store staff notification', [
                        'alert_id' => $alert->id,
                        'error' => $exception->getMessage(),
                    ]);
                }
            }

            return $alert;
        });

        // WA dispatch strictly AFTER commit (Fase 3 lesson: no dispatch inside tx).
        foreach ($this->staffRecipients() as $staff) {
            SendPanicWhatsappJob::dispatch($alert->id, PanicAlert::STATUS_ACTIVE, $staff->id);
        }

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function handle(PanicAlert $alert, User $actor): PanicAlert
    {
        if ($alert->status !== PanicAlert::STATUS_ACTIVE) {
            throw ValidationException::withMessages(['status' => ['Hanya alert aktif yang bisa ditangani.']]);
        }

        $alert->update([
            'status' => PanicAlert::STATUS_HANDLED,
            'handler_id' => $actor->id,
            'handled_at' => now(),
        ]);

        $this->notifyReporter($alert->fresh(['reporter']), PanicAlert::STATUS_ACTIVE, PanicAlert::STATUS_HANDLED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function resolve(PanicAlert $alert, User $actor): PanicAlert
    {
        if ($alert->status !== PanicAlert::STATUS_HANDLED) {
            throw ValidationException::withMessages(['status' => ['Hanya alert yang sedang ditangani yang bisa diselesaikan.']]);
        }

        $alert->update(['status' => PanicAlert::STATUS_RESOLVED, 'resolved_at' => now()]);

        $this->notifyReporter($alert->fresh(['reporter']), PanicAlert::STATUS_HANDLED, PanicAlert::STATUS_RESOLVED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    public function cancel(PanicAlert $alert, User $actor): PanicAlert
    {
        if (! in_array($alert->status, [PanicAlert::STATUS_ACTIVE, PanicAlert::STATUS_HANDLED], true)) {
            throw ValidationException::withMessages(['status' => ['Alert ini sudah selesai.']]);
        }

        $old = $alert->status;
        $alert->update(['status' => PanicAlert::STATUS_CANCELLED]);

        $this->notifyReporter($alert->fresh(['reporter']), $old, PanicAlert::STATUS_CANCELLED, $actor);

        return $alert->fresh(['reporter', 'house', 'handler']);
    }

    private function notifyReporter(PanicAlert $alert, string $old, string $new, User $actor): void
    {
        $reporter = $alert->reporter;

        if ($reporter === null) {
            return;
        }

        try {
            $reporter->notify(new PanicAlertUpdated(
                $alert->id, $old, $new, $actor->name, $alert->location_note,
            ));
        } catch (\Throwable $exception) {
            Log::warning('PanicAlertService: failed to store reporter notification', [
                'alert_id' => $alert->id,
                'error' => $exception->getMessage(),
            ]);
        }

        SendPanicWhatsappJob::dispatch($alert->id, $new);
    }

    /**
     * @return Collection<int, User>
     */
    private function staffRecipients()
    {
        return User::whereHas('roles', fn ($query) => $query->whereIn('name', ['admin', 'satpam']))
            ->where('is_active', true)
            ->get();
    }
}
