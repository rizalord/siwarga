import api from './api'
import type { ApiResponse, PaginatedResponse, House, CreateHouseRequest, HouseFilter, HouseResident, AssignResidentRequest } from '@/types/api'

export const housesService = {
  getAll: (params?: HouseFilter) =>
    api.get<PaginatedResponse<House>>('/api/houses', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<House>>(`/api/houses/${id}`),
  create: (data: CreateHouseRequest) =>
    api.post<ApiResponse<House>>('/api/houses', data),
  update: (id: number, data: Partial<CreateHouseRequest>) =>
    api.put<ApiResponse<House>>(`/api/houses/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/houses/${id}`),
  bulkDelete: (ids: number[]) =>
    api.post<ApiResponse<null>>('/api/houses/bulk-delete', { ids }),
  getResidents: (id: number) =>
    api.get<ApiResponse<HouseResident[]>>(`/api/houses/${id}/history`),
  assignResident: (id: number, data: AssignResidentRequest) =>
    api.post<ApiResponse<HouseResident>>(`/api/houses/${id}/assign-resident`, data),
  vacateResident: (id: number) =>
    api.post<ApiResponse<null>>(`/api/houses/${id}/vacate-resident`),
}
