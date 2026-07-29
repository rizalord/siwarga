import type {
  ApiResponse,
  PaginatedResponse,
  Resident,
  CreateResidentRequest,
  UpdateResidentRequest,
  ResidentFilter,
} from '@/types/api'
import api from './api'

function toResidentFormData(
  data: CreateResidentRequest | UpdateResidentRequest
) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value)
    }
  })
  return formData
}

export const residentsService = {
  getAll: (params?: ResidentFilter) =>
    api.get<PaginatedResponse<Resident>>('/api/residents', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Resident>>(`/api/residents/${id}`),
  create: (data: CreateResidentRequest) =>
    api.post<ApiResponse<Resident>>(
      '/api/residents',
      toResidentFormData(data),
      {
        headers: { 'Content-Type': undefined },
      }
    ),
  update: (id: number, data: UpdateResidentRequest) => {
    const formData = toResidentFormData(data)
    formData.append('_method', 'PUT')
    return api.post<ApiResponse<Resident>>(`/api/residents/${id}`, formData, {
      headers: { 'Content-Type': undefined },
    })
  },
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/residents/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<Resident>>(`/api/residents/${id}/restore`),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/residents/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/residents/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/residents/bulk-restore', { ids }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/residents/bulk-force-delete', { ids }),
}
