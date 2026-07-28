import { useMutation, useQuery } from '@tanstack/react-query'
import { activityLogsService } from '@/services/activity-logs'
import type { ActivityLogFilter, TrackPageViewRequest } from '@/types/api'

export function useActivityLogs(params?: ActivityLogFilter) {
  return useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => activityLogsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useTrackPageView() {
  return useMutation({
    mutationFn: (data: TrackPageViewRequest) => activityLogsService.track(data),
  })
}
