import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { forumService } from '@/services/forum'
import type { ForumThreadFilter } from '@/types/api'
import { toast } from 'sonner'

export function useForumThreads(params?: ForumThreadFilter) {
  return useQuery({
    queryKey: ['forum-threads', params],
    queryFn: () => forumService.getThreads(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useForumThread(id: number) {
  return useQuery({
    queryKey: ['forum-threads', id],
    queryFn: () => forumService.getThread(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useForumPosts(threadId: number, page?: number) {
  return useQuery({
    queryKey: ['forum-posts', threadId, page],
    queryFn: () => forumService.getPosts(threadId, page),
    select: (res) => res.data,
    enabled: !!threadId,
    placeholderData: (prev) => prev,
  })
}

export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => forumService.createThread(title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-threads'] })
      toast.success('Diskusi berhasil dibuat')
    },
    onError: () => toast.error('Gagal membuat diskusi'),
  })
}

export function useCreatePost(threadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => forumService.createPost(threadId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-posts', threadId] })
      qc.invalidateQueries({ queryKey: ['forum-threads'] })
      toast.success('Balasan terkirim')
    },
    onError: () => toast.error('Gagal mengirim balasan'),
  })
}

export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => forumService.deleteThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-threads'] })
      toast.success('Diskusi berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus diskusi'),
  })
}
