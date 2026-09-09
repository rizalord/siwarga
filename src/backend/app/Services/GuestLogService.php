<?php

namespace App\Services;

use App\Models\GuestLog;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GuestLogService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function register(array $data, User $user): GuestLog
    {
        $data['guest_name'] = $this->htmlSanitizer->sanitize($data['guest_name']);

        if (isset($data['purpose']) && $data['purpose'] !== null) {
            $data['purpose'] = $this->htmlSanitizer->sanitize($data['purpose']);
        }

        // Staff walk-in goes straight to checked_in; warga pre-registration
        // stays registered with a QR token for later check-in.
        if ($user->hasPermission('guest-logs.manage')) {
            return GuestLog::create([...$data,
                'registered_by' => $user->id,
                'status' => GuestLog::STATUS_CHECKED_IN,
                'checked_in_at' => now(),
                'recorded_by' => $user->id,
            ]);
        }

        return GuestLog::create([...$data,
            'registered_by' => $user->id,
            'qr_token' => Str::random(32),
            'status' => GuestLog::STATUS_REGISTERED,
        ]);
    }

    public function checkIn(GuestLog $log, User $actor): GuestLog
    {
        if ($log->status !== GuestLog::STATUS_REGISTERED) {
            throw ValidationException::withMessages(['status' => ['Hanya tamu terdaftar yang bisa check-in.']]);
        }

        $log->update([
            'status' => GuestLog::STATUS_CHECKED_IN,
            'checked_in_at' => now(),
            'recorded_by' => $actor->id,
        ]);

        return $log->fresh(['house', 'registrar', 'recorder']);
    }

    public function checkOut(GuestLog $log): GuestLog
    {
        if ($log->status !== GuestLog::STATUS_CHECKED_IN) {
            throw ValidationException::withMessages(['status' => ['Hanya tamu yang sudah masuk yang bisa check-out.']]);
        }

        $log->update([
            'status' => GuestLog::STATUS_CHECKED_OUT,
            'checked_out_at' => now(),
        ]);

        return $log->fresh(['house', 'registrar', 'recorder']);
    }
}
