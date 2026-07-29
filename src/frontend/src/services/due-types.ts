import type {
  ApiResponse,
  PaginatedResponse,
  DueType,
  DueTypeFilter,
  CreateDueTypeRequest,
} from '@/types/api'
import api from './api'

export const dueTypesService = {
  getAll: (params?: DueTypeFilter) =>
    api.get<PaginatedResponse<DueType>>('/api/due-types', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<DueType>>(`/api/due-types/${id}`),
  create: (data: CreateDueTypeRequest) =>
    api.post<ApiResponse<DueType>>('/api/due-types', data),
  update: (id: number, data: CreateDueTypeRequest) =>
    api.put<ApiResponse<DueType>>(`/api/due-types/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/due-types/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<DueType>>(`/api/due-types/${id}/restore`),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/due-types/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/due-types/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/due-types/bulk-restore', { ids }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/due-types/bulk-force-delete', { ids }),
}
