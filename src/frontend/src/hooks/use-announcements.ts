import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsService } from '@/services/announcements'
import type {
  AnnouncementFilter,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
} from '@/types/api'
import { toast } from 'sonner'

export function useAnnouncements(params?: AnnouncementFilter) {
  return useQuery({
    queryKey: ['announcements', params],
    queryFn: () => announcementsService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useAnnouncement(id: number) {
  return useQuery({
    queryKey: ['announcements', id],
    queryFn: () => announcementsService.getById(id),
    select: (res) => res.data.data,
    enabled: !!id,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) =>
      announcementsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil ditambahkan')
    },
  })
}

export function useUpdateAnnouncement(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateAnnouncementRequest) =>
      announcementsService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil diperbarui')
    },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => announcementsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success('Pengumuman berhasil dihapus')
    },
  })
}

export function usePublishAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => announcementsService.publish(id),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['announcements'] })
      toast.success(response.data.message ?? 'Pengumuman sedang dikirim')
    },
  })
}
