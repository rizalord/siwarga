import type {
  ActivityLog,
  ActivityLogFilter,
  PaginatedResponse,
  TrackPageViewRequest,
} from '@/types/api'
import api from './api'

export const activityLogsService = {
  getAll: (params?: ActivityLogFilter) =>
    api.get<PaginatedResponse<ActivityLog>>('/api/activity-logs', { params }),
  track: (data: TrackPageViewRequest) =>
    api.post('/api/activity-logs/track', data),
}
