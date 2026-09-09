import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsAdminService } from '@/services/events-admin'
import type { EventFilter } from '@/types/api'
import { toast } from 'sonner'

export function useAdminEvents(params?: EventFilter) {
  return useQuery({
    queryKey: ['admin-events', params],
    queryFn: () => eventsAdminService.getAll(params),
    select: (res) => res.data,
    placeholderData: (prev) => prev,
  })
}

export function useAdminEvent(id: number | null) {
  return useQuery({
    queryKey: ['admin-event', id],
    queryFn: () => eventsAdminService.getById(id as number),
    select: (res) => res.data.data,
    enabled: id !== null,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      eventsAdminService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      toast.success('Kegiatan berhasil dibuat')
    },
    onError: () => toast.error('Gagal membuat kegiatan'),
  })
}

export function useUpdateEvent(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      eventsAdminService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      qc.invalidateQueries({ queryKey: ['admin-event', id] })
      toast.success('Kegiatan berhasil diperbarui')
    },
    onError: () => toast.error('Gagal memperbarui kegiatan'),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => eventsAdminService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      toast.success('Kegiatan berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus kegiatan'),
  })
}

export function useUploadDocumentation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      photo,
      media_type,
      caption,
    }: {
      photo: File
      media_type: string
      caption?: string
    }) =>
      eventsAdminService.uploadDocumentation(id, photo, media_type, caption),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      qc.invalidateQueries({ queryKey: ['admin-event', id] })
      toast.success('Dokumentasi berhasil diunggah')
    },
    onError: () => toast.error('Gagal mengunggah dokumentasi'),
  })
}

export function useDeleteDocumentation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: number) =>
      eventsAdminService.deleteDocumentation(docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      toast.success('Dokumentasi berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus dokumentasi'),
  })
}
