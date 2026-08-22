<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PageResource;
use App\Models\Page;
use App\Services\PageService;
use Illuminate\Http\Request;

class PageController extends Controller
{
    public function __construct(private PageService $pageService) {}

    public function show(string $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        return new PageResource($page);
    }

    public function update(Request $request, string $slug)
    {
        $page = Page::where('slug', $slug)->firstOrFail();

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'content' => ['sometimes', 'nullable', 'string'],
            'hero_image' => ['sometimes', 'nullable', 'image', 'max:2048'],
        ]);

        unset($validated['hero_image']);

        $page = $this->pageService->update($page, $validated, $request->file('hero_image'), $request->user()->id);

        return new PageResource($page);
    }
}
