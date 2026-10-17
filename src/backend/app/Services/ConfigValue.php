<?php

namespace App\Services;

/**
 * Typed equivalent of `(string) config($key, $default)`. Unlike
 * `config()->string()`, a null (unset env) value yields '' instead of throwing.
 */
final class ConfigValue
{
    public static function string(string $key, string $default = ''): string
    {
        $value = config($key, $default);

        return is_scalar($value) ? (string) $value : '';
    }
}
