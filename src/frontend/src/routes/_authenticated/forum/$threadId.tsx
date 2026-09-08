import { createFileRoute } from '@tanstack/react-router'
import { ForumThreadDetailPage } from '@/features/siwarga-forum/forum-thread-detail-page'

export const Route = createFileRoute('/_authenticated/forum/$threadId')({
  params: {
    parse: (params) => ({ threadId: Number(params.threadId) }),
    stringify: (params) => ({ threadId: String(params.threadId) }),
  },
  component: ForumThreadDetailPage,
})
