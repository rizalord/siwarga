import type {
  ApiResponse,
  PaginatedResponse,
  WargaAnnouncement,
  WargaAnnouncementFilter,
} from '@/types/api'
import api from './api'

export const wargaAnnouncementsService = {
  getAll: (params?: WargaAnnouncementFilter) =>
    api.get<PaginatedResponse<WargaAnnouncement>>('/api/warga/announcements', {
      params,
    }),
  getById: (id: number) =>
    api.get<ApiResponse<WargaAnnouncement>>(`/api/warga/announcements/${id}`),
}
