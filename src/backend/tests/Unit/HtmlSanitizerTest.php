<?php

namespace Tests\Unit;

use App\Services\HtmlSanitizer;
use Tests\TestCase;

class HtmlSanitizerTest extends TestCase
{
    public function test_strips_script_tags()
    {
        $result = (new HtmlSanitizer)->sanitize('<p>Hello</p><script>alert("xss")</script>');

        $this->assertStringNotContainsString('<script>', $result);
        $this->assertStringContainsString('<p>Hello</p>', $result);
    }

    public function test_strips_event_handler_attributes()
    {
        $result = (new HtmlSanitizer)->sanitize('<p onclick="alert(1)">Click</p>');

        $this->assertStringNotContainsString('onclick', $result);
    }

    public function test_keeps_basic_formatting_tags()
    {
        $result = (new HtmlSanitizer)->sanitize('<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>One</li></ul>');

        $this->assertStringContainsString('<h2>', $result);
        $this->assertStringContainsString('<strong>', $result);
        $this->assertStringContainsString('<em>', $result);
        $this->assertStringContainsString('<li>', $result);
    }
}
