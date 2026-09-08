import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ForumThreadsPage } from '@/features/siwarga-forum/forum-threads-page'

const forumSearchSchema = z.object({
  page: z.number().optional().catch(1),
  search: z.string().optional().catch(''),
})

export const Route = createFileRoute('/_authenticated/forum/')({
  validateSearch: forumSearchSchema,
  component: ForumThreadsPage,
})
