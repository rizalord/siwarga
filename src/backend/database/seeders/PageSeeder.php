<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'slug' => 'home',
                'title' => 'Beranda',
                'content' => null,
            ],
            [
                'slug' => 'profil-komplek',
                'title' => 'Profil Komplek',
                'content' => null,
            ],
            [
                'slug' => 'kontak',
                'title' => 'Kontak',
                'content' => null,
            ],
        ];

        foreach ($pages as $page) {
            Page::query()->firstOrCreate(
                ['slug' => $page['slug']],
                [
                    'title' => $page['title'],
                    'content' => $page['content'],
                    'hero_image' => null,
                    'updated_by' => null,
                ]
            );
        }
    }
}
