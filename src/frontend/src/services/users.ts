import api from './api'
import type { ApiResponse, PaginatedResponse, User } from '@/types/api'

export const usersService = {
  getAll: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<User>>('/api/users', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<User>>(`/api/users/${id}`),
  create: (data: { name: string; email: string; password: string; is_active?: boolean; role_ids?: number[] }) =>
    api.post<ApiResponse<User>>('/api/users', data),
  update: (id: number, data: { name?: string; email?: string; is_active?: boolean; role_ids?: number[] }) =>
    api.put<ApiResponse<User>>(`/api/users/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/users/${id}`),
}
