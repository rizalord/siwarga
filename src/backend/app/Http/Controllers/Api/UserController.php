<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::with('roles')->paginate($request->per_page ?? 10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $user = User::create($validated);

        if ($request->has('role_ids')) {
            $user->roles()->attach($request->role_ids);
        }

        return response()->json(['data' => $user->load('roles')], 201);
    }

    public function show(User $user)
    {
        return response()->json(['data' => $user->load('roles')]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'sometimes|string|min:8',
            'is_active' => 'sometimes|boolean',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        if ($request->has('role_ids')) {
            $user->roles()->sync($request->role_ids);
        }

        return response()->json(['data' => $user->load('roles')]);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['data' => null, 'message' => 'Deleted']);
    }
}
