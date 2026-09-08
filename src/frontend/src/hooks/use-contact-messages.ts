import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactMessagesService } from '@/services/contact-messages'
import type { ContactMessageFilter } from '@/types/api'

export function useContactMessages(params?: ContactMessageFilter) {
  return useQuery({
    queryKey: ['contact-messages', params],
    queryFn: () => contactMessagesService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useContactMessage(id: number) {
  return useQuery({
    queryKey: ['contact-messages', id],
    queryFn: () => contactMessagesService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useMarkContactMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contactMessagesService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-messages'] })
    },
  })
}
