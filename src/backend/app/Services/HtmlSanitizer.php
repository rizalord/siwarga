<?php

namespace App\Services;

use Mews\Purifier\Facades\Purifier;

class HtmlSanitizer
{
    public function sanitize(string $html): string
    {
        return Purifier::clean($html, [
            'HTML.Allowed' => 'p,br,strong,em,a[href],h1,h2,h3,h4,ul,ol,li,img[src|alt],blockquote',
            'URI.AllowedSchemes' => ['http', 'https', 'mailto', 'tel'],
        ]);
    }
}
