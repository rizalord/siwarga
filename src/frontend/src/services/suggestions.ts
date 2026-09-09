import type {
  ApiResponse,
  PaginatedResponse,
  Suggestion,
  SuggestionFilter,
} from '@/types/api'
import api from './api'

export const suggestionsService = {
  create: (content: string) =>
    api.post<ApiResponse<Suggestion>>('/api/suggestions', { content }),
  getAll: (params?: SuggestionFilter) =>
    api.get<PaginatedResponse<Suggestion>>('/api/suggestions', { params }),
  markReviewed: (id: number) =>
    api.post<ApiResponse<Suggestion>>(`/api/suggestions/${id}/mark-reviewed`),
}
