import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pagesService } from '@/services/pages'
import type { UpdatePageRequest } from '@/types/api'
import { toast } from 'sonner'

export function usePage(slug: string) {
  return useQuery({
    queryKey: ['pages', slug],
    queryFn: () => pagesService.getBySlug(slug),
    select: (res) => res.data.data,
    enabled: !!slug,
  })
}

export function useUpdatePage(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePageRequest) => pagesService.update(slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pages', slug] })
      toast.success('Halaman berhasil diperbarui')
    },
  })
}
