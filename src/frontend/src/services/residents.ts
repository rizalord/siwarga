import api from './api'
import type { ApiResponse, PaginatedResponse, Resident, CreateResidentRequest, UpdateResidentRequest, ResidentFilter } from '@/types/api'

export const residentsService = {
  getAll: (params?: ResidentFilter) =>
    api.get<PaginatedResponse<Resident>>('/api/residents', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Resident>>(`/api/residents/${id}`),
  create: (data: CreateResidentRequest) =>
    api.post<ApiResponse<Resident>>('/api/residents', data),
  update: (id: number, data: UpdateResidentRequest) =>
    api.put<ApiResponse<Resident>>(`/api/residents/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/residents/${id}`),
}
