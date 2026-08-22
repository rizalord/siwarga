<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WahaService
{
    public function sendMessage(string $phoneNumber, string $message): bool
    {
        $response = Http::withHeaders([
            'X-Api-Key' => config('services.waha.api_key'),
        ])->post(rtrim(config('services.waha.base_url'), '/').'/api/sendText', [
            'session' => config('services.waha.session'),
            'chatId' => $this->toChatId($phoneNumber),
            'text' => $message,
        ]);

        return $response->successful();
    }

    private function toChatId(string $phoneNumber): string
    {
        $digits = preg_replace('/\D/', '', $phoneNumber);

        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        }

        return $digits.'@c.us';
    }
}
