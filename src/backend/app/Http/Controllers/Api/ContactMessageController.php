<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'message' => ['required', 'string'],
        ]);

        $message = ContactMessage::create([...$validated, 'status' => 'new']);

        return response()->json(['data' => ['id' => $message->id], 'message' => 'Pesan terkirim'], 201);
    }
}
