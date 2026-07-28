import { http, HttpResponse } from 'msw'
import { mockActivityLogs } from '../data/activity-logs'

export const activityLogHandlers = [
  http.get('/api/activity-logs', ({ request }) => {
    const url = new URL(request.url)
    let logs = [...mockActivityLogs]

    const search = url.searchParams.get('search')
    if (search) {
      logs = logs.filter((l) =>
        l.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    const action = url.searchParams.get('action')
    if (action) {
      logs = logs.filter((l) => l.action === action)
    }

    const subjectType = url.searchParams.get('subject_type')
    if (subjectType) {
      logs = logs.filter((l) => l.subject_type === subjectType)
    }

    return HttpResponse.json({
      data: logs,
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: logs.length,
    })
  }),

  http.post('/api/activity-logs/track', () =>
    HttpResponse.json({ data: null })
  ),
]
