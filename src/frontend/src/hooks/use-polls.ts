import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pollsService } from '@/services/polls'
import type { PollFilter, CreatePollRequest } from '@/types/api'
import { toast } from 'sonner'

export function usePolls(params?: PollFilter) {
  return useQuery({
    queryKey: ['polls', params],
    queryFn: () => pollsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function usePoll(id: number) {
  return useQuery({
    queryKey: ['polls', id],
    queryFn: () => pollsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function usePollResults(id: number | null) {
  return useQuery({
    queryKey: ['polls', id, 'results'],
    queryFn: () => pollsService.results(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
    retry: false,
  })
}

export function useCreatePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePollRequest) => pollsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Polling berhasil dibuat')
    },
    onError: () => toast.error('Gagal membuat polling'),
  })
}

export function useVotePoll(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (option_id: number) => pollsService.vote(id, option_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Suara berhasil direkam')
    },
    onError: () => toast.error('Gagal merekam suara'),
  })
}

export function useDeletePoll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pollsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['polls'] })
      toast.success('Polling berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus polling'),
  })
}
