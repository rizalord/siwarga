<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = ContactMessage::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $this->applySorting($query, $request, ['created_at'], 'created_at');

        return $this->paginated($query->paginate($request->per_page ?? 10), ContactMessageResource::class);
    }

    public function show(ContactMessage $contactMessage)
    {
        return new ContactMessageResource($contactMessage);
    }

    public function markRead(ContactMessage $contactMessage)
    {
        $contactMessage->update(['status' => 'read']);

        return new ContactMessageResource($contactMessage);
    }
}
