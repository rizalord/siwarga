<?php

namespace App\Payments;

class PaymentProviderRegistry
{
    /**
     * @return array<string, class-string<PaymentProvider>>
     */
    public static function map(): array
    {
        return [
            'simulator' => SimulatorProvider::class,
            'xendit' => XenditProvider::class,
            'midtrans' => MidtransProvider::class,
        ];
    }

    public static function for(?string $key = null): PaymentProvider
    {
        $key ??= (string) config('services.payments.provider', 'simulator');
        $map = self::map();

        if (! isset($map[$key])) {
            throw new \InvalidArgumentException("Unknown payment provider [{$key}].");
        }

        return app($map[$key]);
    }
}
