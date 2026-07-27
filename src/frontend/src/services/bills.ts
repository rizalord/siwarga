import api from './api'
import type { ApiResponse, PaginatedResponse, Bill, GenerateBillsRequest, BillFilter } from '@/types/api'

export const billsService = {
  getAll: (params?: BillFilter) =>
    api.get<PaginatedResponse<Bill>>('/api/bills', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Bill>>(`/api/bills/${id}`),
  generate: (data: GenerateBillsRequest) =>
    api.post<ApiResponse<Bill[]>>('/api/bills/generate', data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/bills/${id}`),
}
