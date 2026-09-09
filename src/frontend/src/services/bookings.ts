import type {
  ApiResponse,
  PaginatedResponse,
  Booking,
  BookingFilter,
  CreateBookingRequest,
  Facility,
  FacilityFilter,
  CreateFacilityRequest,
} from '@/types/api'
import api from './api'

export const facilitiesService = {
  getAll: (params?: FacilityFilter) =>
    api.get<PaginatedResponse<Facility>>('/api/facilities', { params }),
  getById: (id: number) => api.get<ApiResponse<Facility>>(`/api/facilities/${id}`),
  create: (data: CreateFacilityRequest) =>
    api.post<ApiResponse<Facility>>('/api/facilities', data),
  update: (id: number, data: Partial<CreateFacilityRequest>) =>
    api.put<ApiResponse<Facility>>(`/api/facilities/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/facilities/${id}`),
}

export const bookingsService = {
  getAll: (params?: BookingFilter) =>
    api.get<PaginatedResponse<Booking>>('/api/bookings', { params }),
  getById: (id: number) => api.get<ApiResponse<Booking>>(`/api/bookings/${id}`),
  create: (data: CreateBookingRequest) =>
    api.post<ApiResponse<Booking>>('/api/bookings', data),
  approve: (id: number) =>
    api.post<ApiResponse<Booking>>(`/api/bookings/${id}/approve`),
  reject: (id: number, reason?: string) =>
    api.post<ApiResponse<Booking>>(`/api/bookings/${id}/reject`, { reason }),
  cancel: (id: number) =>
    api.post<ApiResponse<Booking>>(`/api/bookings/${id}/cancel`),
}
