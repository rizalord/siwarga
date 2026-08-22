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
            'slug' => 'complex-profile',
            'title' => 'Complex Profile',
            'content' => '<p>A brief history of the community.</p>',
        ]);

        $this->assertDatabaseHas('pages', [
            'slug' => 'complex-profile',
            'title' => 'Complex Profile',
        ]);
        $this->assertEquals('<p>A brief history of the community.</p>', $page->content);
    }

    public function test_slug_must_be_unique()
    {
        Page::factory()->create(['slug' => 'contact']);

        $this->expectException(QueryException::class);

        Page::factory()->create(['slug' => 'contact']);
    }

    public function test_page_belongs_to_updater()
    {
        $user = User::factory()->create();
        $page = Page::factory()->create(['updated_by' => $user->id]);

        $this->assertTrue($page->updatedBy->is($user));
    }
}
