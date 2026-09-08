import type {
  ApiResponse,
  PaginatedResponse,
  ForumThread,
  ForumPost,
  ForumThreadFilter,
} from '@/types/api'
import api from './api'

export const forumService = {
  getThreads: (params?: ForumThreadFilter) =>
    api.get<PaginatedResponse<ForumThread>>('/api/forum-threads', { params }),
  getThread: (id: number) =>
    api.get<ApiResponse<ForumThread>>(`/api/forum-threads/${id}`),
  createThread: (title: string) =>
    api.post<ApiResponse<ForumThread>>('/api/forum-threads', { title }),
  deleteThread: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/forum-threads/${id}`),
  getPosts: (threadId: number, page?: number) =>
    api.get<PaginatedResponse<ForumPost>>(
      `/api/forum-threads/${threadId}/posts`,
      { params: { page } }
    ),
  createPost: (threadId: number, content: string) =>
    api.post<ApiResponse<ForumPost>>(`/api/forum-threads/${threadId}/posts`, {
      content,
    }),
  deletePost: (id: number) =>
    api.delete<ApiResponse<null>>(`/api/forum-posts/${id}`),
}
