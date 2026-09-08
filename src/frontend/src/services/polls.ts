import type {
  ApiResponse,
  PaginatedResponse,
  Poll,
  PollFilter,
  PollResults,
  CreatePollRequest,
} from '@/types/api'
import api from './api'

export const pollsService = {
  getAll: (params?: PollFilter) =>
    api.get<PaginatedResponse<Poll>>('/api/polls', { params }),
  getById: (id: number) => api.get<ApiResponse<Poll>>(`/api/polls/${id}`),
  create: (data: CreatePollRequest) =>
    api.post<ApiResponse<Poll>>('/api/polls', data),
  update: (id: number, data: Partial<CreatePollRequest>) =>
    api.put<ApiResponse<Poll>>(`/api/polls/${id}`, data),
  delete: (id: number) => api.delete<ApiResponse<null>>(`/api/polls/${id}`),
  vote: (id: number, option_id: number) =>
    api.post<ApiResponse<null>>(`/api/polls/${id}/vote`, { option_id }),
  results: (id: number) =>
    api.get<ApiResponse<PollResults>>(`/api/polls/${id}/results`),
}
