import type {
  ApiResponse,
  PaginatedResponse,
  PatrolFilter,
  PatrolInput,
  PatrolSchedule,
} from '@/types/api'
import api from './api'

export const patrolsService = {
  getAll: (params?: PatrolFilter) =>
    api.get<PaginatedResponse<PatrolSchedule>>('/api/patrol-schedules', {
      params,
    }),
  create: (input: PatrolInput) =>
    api.post<ApiResponse<PatrolSchedule>>('/api/patrol-schedules', input),
  update: (id: number, input: Partial<PatrolInput>) =>
    api.put<ApiResponse<PatrolSchedule>>(`/api/patrol-schedules/${id}`, input),
  remove: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/patrol-schedules/${id}`),
}
