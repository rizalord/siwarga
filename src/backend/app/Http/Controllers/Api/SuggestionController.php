<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SuggestionResource;
use App\Models\AnonymousSuggestion;
use Illuminate\Http\Request;

class SuggestionController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => ['required', 'string', 'max:2000'],
        ]);

        // Deliberately no user reference: anonymous by design.
        $suggestion = AnonymousSuggestion::create($validated);

        return (new SuggestionResource($suggestion))->response()->setStatusCode(201);
    }

    public function index(Request $request)
    {
        $query = AnonymousSuggestion::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->orderByDesc('id');

        return $this->paginated($query->paginate($request->per_page ?? 10), SuggestionResource::class);
    }

    public function markReviewed(AnonymousSuggestion $suggestion)
    {
        $suggestion->update(['status' => 'reviewed']);

        return new SuggestionResource($suggestion);
    }
}
