import { useQuery, useQueryClient } from '@tanstack/react-query'
import { wargaAnnouncementsService } from '@/services/warga-announcements'
import type { WargaAnnouncementFilter } from '@/types/api'

export function useWargaAnnouncements(params?: WargaAnnouncementFilter) {
  return useQuery({
    queryKey: ['warga-announcements', params],
    queryFn: () => wargaAnnouncementsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useWargaAnnouncement(id: number | null) {
  const qc = useQueryClient()
  return useQuery({
    // NOTE: singular 'warga-announcement' key on purpose — the queryFn below
    // invalidates the plural 'warga-announcements' list prefix, which must
    // NOT match this detail query or it refetch-loops (TanStack anti-pattern).
    queryKey: ['warga-announcement', id],
    queryFn: async () => {
      const res = await wargaAnnouncementsService.getById(id as number)
      // Opening the detail marks it read server-side: refresh the list badge.
      qc.invalidateQueries({ queryKey: ['warga-announcements'] })
      return res.data.data
    },
    enabled: id !== null,
  })
}
