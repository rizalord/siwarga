<?php

namespace Tests\Unit;

use App\Models\Page;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_can_be_created_with_slug_and_content()
    {
        $page = Page::factory()->create([
            'slug' => 'profil-komplek',
            'title' => 'Profil Komplek',
            'content' => '<p>Sejarah singkat komplek.</p>',
        ]);

        $this->assertDatabaseHas('pages', [
            'slug' => 'profil-komplek',
            'title' => 'Profil Komplek',
        ]);
        $this->assertEquals('<p>Sejarah singkat komplek.</p>', $page->content);
    }

    public function test_slug_must_be_unique()
    {
        Page::factory()->create(['slug' => 'kontak']);

        $this->expectException(QueryException::class);

        Page::factory()->create(['slug' => 'kontak']);
    }

    public function test_page_belongs_to_updater()
    {
        $user = User::factory()->create();
        $page = Page::factory()->create(['updated_by' => $user->id]);

        $this->assertTrue($page->updatedBy->is($user));
    }
}
