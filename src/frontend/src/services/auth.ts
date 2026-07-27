import api from './api'
import type { ApiResponse, AuthResponse, LoginRequest } from '@/types/api'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/api/auth/login', data),

  logout: () =>
    api.post<ApiResponse<null>>('/api/auth/logout'),

  refresh: () =>
    api.post<ApiResponse<{ token: string }>>('/api/auth/refresh'),

  me: () =>
    api.get<ApiResponse<{ user: AuthResponse['user']; permissions: string[] }>>('/api/auth/me'),
}
