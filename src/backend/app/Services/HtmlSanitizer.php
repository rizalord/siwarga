<?php

namespace App\Services;

use Mews\Purifier\Facades\Purifier;

class HtmlSanitizer
{
    public function sanitize(string $html): string
    {
        $clean = Purifier::clean($html, [
            'HTML.Allowed' => 'p,br,strong,em,a[href],h1,h2,h3,h4,ul,ol,li,img[src|alt],blockquote',
            'URI.AllowedSchemes' => ['http', 'https', 'mailto', 'tel'],
        ]);

        return is_string($clean) ? $clean : '';
    }

    /**
     * Sanitize a validated input value; non-strings (e.g. null) pass through unchanged.
     */
    public function sanitizeValue(mixed $value): mixed
    {
        return is_string($value) ? $this->sanitize($value) : $value;
    }
}
