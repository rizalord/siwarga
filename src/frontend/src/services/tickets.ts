import type {
  ApiResponse,
  PaginatedResponse,
  Ticket,
  TicketComment,
  TicketAttachment,
  TicketFilter,
  CreateTicketRequest,
} from '@/types/api'
import api from './api'

export const ticketsService = {
  getAll: (params?: TicketFilter) =>
    api.get<PaginatedResponse<Ticket>>('/api/tickets', { params }),
  getById: (id: number) => api.get<ApiResponse<Ticket>>(`/api/tickets/${id}`),
  create: (data: CreateTicketRequest) =>
    api.post<ApiResponse<Ticket>>('/api/tickets', data),
  changeStatus: (id: number, status: string) =>
    api.post<ApiResponse<Ticket>>(`/api/tickets/${id}/status`, { status }),
  assign: (id: number, assigned_to: number) =>
    api.post<ApiResponse<Ticket>>(`/api/tickets/${id}/assign`, { assigned_to }),
  getComments: (id: number) =>
    api.get<ApiResponse<TicketComment[]>>(`/api/tickets/${id}/comments`),
  addComment: (id: number, comment: string) =>
    api.post<ApiResponse<TicketComment>>(`/api/tickets/${id}/comments`, {
      comment,
    }),
  uploadAttachment: (id: number, photo: File) => {
    const form = new FormData()
    form.append('photo', photo)
    return api.post<ApiResponse<TicketAttachment>>(
      `/api/tickets/${id}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
}
