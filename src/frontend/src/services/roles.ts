import api from './api'
import type { ApiResponse, PaginatedResponse, Role, RoleFilter, CreateRoleRequest } from '@/types/api'

export const rolesService = {
  getAll: (params?: RoleFilter) =>
    api.get<PaginatedResponse<Role>>('/api/roles', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Role>>(`/api/roles/${id}`),
  create: (data: CreateRoleRequest) =>
    api.post<ApiResponse<Role>>('/api/roles', data),
  update: (id: number, data: Partial<CreateRoleRequest>) =>
    api.put<ApiResponse<Role>>(`/api/roles/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/roles/${id}`),
}
