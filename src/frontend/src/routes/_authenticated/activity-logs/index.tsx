import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ActivityLogsPage } from '@/features/siwarga-activity-logs'

const activityLogsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  search: z.string().optional().catch(''),
  sort: z.string().optional().catch(undefined),
  order: z
    .union([z.literal('asc'), z.literal('desc')])
    .optional()
    .catch(undefined),
  action: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  subject_type: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/activity-logs/')({
  validateSearch: activityLogsSearchSchema,
  component: ActivityLogsPage,
})
