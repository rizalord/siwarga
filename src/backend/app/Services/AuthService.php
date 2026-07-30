<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid.'],
            ]);
        }

        $token = $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;

        ActivityLog::record('login', "Login: {$user->name}", $user, actorId: $user->id);

        return [
            'user' => $user,
            'token' => $token,
            'permissions' => $user->getAllPermissions(),
        ];
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();

        ActivityLog::record('logout', "Logout: {$user->name}", $user);
    }

    public function refresh(User $user): string
    {
        $user->currentAccessToken()->delete();

        return $user->createToken('api-token', expiresAt: now()->addHours(24))->plainTextToken;
    }

    public function me(User $user): array
    {
        return [
            'user' => $user->load('roles.permissions'),
            'permissions' => $user->getAllPermissions(),
        ];
    }
}
