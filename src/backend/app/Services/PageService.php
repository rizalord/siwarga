<?php

namespace App\Services;

use App\Models\Page;
use Illuminate\Http\UploadedFile;

class PageService
{
    public function __construct(private HtmlSanitizer $htmlSanitizer) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Page $page, array $data, ?UploadedFile $heroImage, int $userId): Page
    {
        if (array_key_exists('content', $data)) {
            $data['content'] = $data['content'] === null
                ? null
                : $this->htmlSanitizer->sanitize($data['content']);
        }

        if ($heroImage !== null) {
            $data['hero_image'] = $heroImage->store('page-hero-images', 'public');
        }

        $data['updated_by'] = $userId;

        $page->update($data);

        return $page;
    }
}
