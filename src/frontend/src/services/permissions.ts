import api from './api'
import type { ApiResponse, PaginatedResponse, Permission, PermissionFilter, CreatePermissionRequest } from '@/types/api'

export const permissionsService = {
  getAll: (params?: PermissionFilter) =>
    api.get<PaginatedResponse<Permission>>('/api/permissions', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Permission>>(`/api/permissions/${id}`),
  create: (data: CreatePermissionRequest) =>
    api.post<ApiResponse<Permission>>('/api/permissions', data),
  update: (id: number, data: Partial<CreatePermissionRequest>) =>
    api.put<ApiResponse<Permission>>(`/api/permissions/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/permissions/${id}`),
}
