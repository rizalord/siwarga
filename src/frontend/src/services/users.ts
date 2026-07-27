import api from './api'
import type { ApiResponse, PaginatedResponse, User } from '@/types/api'

export const usersService = {
  getAll: () =>
    api.get<PaginatedResponse<User>>('/api/users'),
  getById: (id: number) =>
    api.get<ApiResponse<User>>(`/api/users/${id}`),
  create: (data: { name: string; email: string; password: string; is_active?: boolean }) =>
    api.post<ApiResponse<User>>('/api/users', data),
  update: (id: number, data: { name?: string; email?: string; is_active?: boolean }) =>
    api.put<ApiResponse<User>>(`/api/users/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/users/${id}`),
}
