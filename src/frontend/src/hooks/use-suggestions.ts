import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestionsService } from '@/services/suggestions'
import type { SuggestionFilter } from '@/types/api'
import { toast } from 'sonner'

export function useSuggestions(params?: SuggestionFilter) {
  return useQuery({
    queryKey: ['suggestions', params],
    queryFn: () => suggestionsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useCreateSuggestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: string) => suggestionsService.create(content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Saran berhasil dikirim secara anonim')
    },
    onError: () => toast.error('Gagal mengirim saran'),
  })
}

export function useMarkSuggestionReviewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => suggestionsService.markReviewed(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
      toast.success('Saran ditandai sudah dibaca')
    },
    onError: () => toast.error('Gagal menandai saran'),
  })
}
