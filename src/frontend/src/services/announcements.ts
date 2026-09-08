import type {
  ApiResponse,
  PaginatedResponse,
  Announcement,
  AnnouncementFilter,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api'
import api from './api'

export const announcementsService = {
  getAll: (params?: AnnouncementFilter) =>
    api.get<PaginatedResponse<Announcement>>('/api/announcements', { params }),
  getById: (id: number) =>
    api.get<ApiResponse<Announcement>>(`/api/announcements/${id}`),
  create: (data: CreateAnnouncementRequest) =>
    api.post<ApiResponse<Announcement>>('/api/announcements', data),
  update: (id: number, data: UpdateAnnouncementRequest) =>
    api.put<ApiResponse<Announcement>>(`/api/announcements/${id}`, data),
  delete: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/announcements/${id}`),
  publish: (id: number) =>
    api.post<ApiResponse<null>>(`/api/announcements/${id}/publish`),
}
