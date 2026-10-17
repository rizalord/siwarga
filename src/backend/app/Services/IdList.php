<?php

namespace App\Services;

/**
 * Normalizes a validated `ids.*` => integer input into a typed list of ints.
 */
final class IdList
{
    /**
     * @return array<int, int>
     */
    public static function from(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return array_values(array_map(
            fn (mixed $id): int => (int) filter_var($id, FILTER_VALIDATE_INT),
            $value,
        ));
    }
}
