<?php

namespace App\Payments;

use App\Services\ConfigValue;

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
        $key ??= ConfigValue::string('services.payments.provider', 'simulator');
        $map = self::map();

        if (! isset($map[$key])) {
            throw new \InvalidArgumentException("Unknown payment provider [{$key}].");
        }

        $provider = app($map[$key]);

        if (! $provider instanceof PaymentProvider) {
            throw new \LogicException("Payment provider [{$key}] must implement ".PaymentProvider::class.'.');
        }

        return $provider;
    }
}
