import api from './api'
import type { ApiResponse, PaginatedResponse, DueType, CreateDueTypeRequest } from '@/types/api'

export const dueTypesService = {
  getAll: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<DueType>>('/api/due-types', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<DueType>>(`/api/due-types/${id}`),
  create: (data: CreateDueTypeRequest) =>
    api.post<ApiResponse<DueType>>('/api/due-types', data),
  update: (id: number, data: CreateDueTypeRequest) =>
    api.put<ApiResponse<DueType>>(`/api/due-types/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/due-types/${id}`),
}
