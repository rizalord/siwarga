import type {
  ApiResponse,
  PaginatedResponse,
  Bill,
  GenerateBillsRequest,
  BillFilter,
} from '@/types/api'
import api from './api'

export const billsService = {
  getAll: (params?: BillFilter) =>
    api.get<PaginatedResponse<Bill>>('/api/bills', { params }),
  getById: (id: number) => api.get<ApiResponse<Bill>>(`/api/bills/${id}`),
  generate: (data: GenerateBillsRequest) =>
    api.post<ApiResponse<Bill[]>>('/api/bills/generate', data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/bills/${id}`),
  restore: (id: number) =>
    api.post<ApiResponse<Bill>>(`/api/bills/${id}/restore`),
  forceDelete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/bills/${id}/force-delete`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/bills/bulk-delete', { ids }),
  bulkRestore: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/bills/bulk-restore', { ids }),
  bulkForceDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/bills/bulk-force-delete', { ids }),
}
